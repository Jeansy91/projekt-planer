import { useRef, useCallback, useState, useEffect } from 'react';
import { detectChanges, reconstructStateAt, stampEntries } from '../utils/historyCore';

const MAX_UNDO = 50;
const MAX_HISTORY = 200;
const DEBOUNCE_MS = 800;

export const useUndoRedo = (tasks, teams, setTasks, setTeams, projectId, projectTitle, setProjectTitle, setHistory, user, onHistoryCommit, onHistoryDelete, historyRef) => {
  // Undo metadata: [{beforeSnapshot: {tasks, teams, title}, entries: [...historyEntries]}]
  const undoMetaRef = useRef([]);
  // Redo stack: [{afterSnapshot: {tasks, teams, title}, entries: [...historyEntries]}]
  const redoStackRef = useRef([]);

  const skipDetectionRef = useRef(false);
  const historySnapshotRef = useRef({ tasks: null, teams: null, title: null });
  const debounceRef = useRef(null);
  const pendingStateRef = useRef(null);
  const prevProjectIdRef = useRef(null);

  const tasksRef = useRef(tasks);
  const teamsRef = useRef(teams);
  const projectTitleRef = useRef(projectTitle);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { teamsRef.current = teams; }, [teams]);
  useEffect(() => { projectTitleRef.current = projectTitle; }, [projectTitle]);

  const [version, setVersion] = useState(0);

  const onHistoryCommitRef = useRef(onHistoryCommit);
  const onHistoryDeleteRef = useRef(onHistoryDelete);
  useEffect(() => { onHistoryCommitRef.current = onHistoryCommit; }, [onHistoryCommit]);
  useEffect(() => { onHistoryDeleteRef.current = onHistoryDelete; }, [onHistoryDelete]);

  const commitChanges = useCallback((snap, currentTasks, currentTeams, currentTitle) => {
    const rawEntries = detectChanges(snap, { tasks: currentTasks, teams: currentTeams, title: currentTitle }, { projectId });
    if (rawEntries.length === 0) return;

    const newEntries = stampEntries(rawEntries, { userId: user?.id || null });

    setHistory(prev => [...newEntries, ...prev].slice(0, MAX_HISTORY));
    undoMetaRef.current = [...undoMetaRef.current, { beforeSnapshot: snap, entries: newEntries }].slice(-MAX_UNDO);
    redoStackRef.current = [];
    setVersion(v => v + 1);

    onHistoryCommitRef.current?.(projectId, newEntries);
  }, [setHistory, user, projectId]);

  const flushPending = useCallback(() => {
    if (!debounceRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = null;

    const snap = historySnapshotRef.current;
    const pending = pendingStateRef.current;
    if (!snap.tasks || !pending) return;
    commitChanges(snap, pending.tasks, pending.teams, pending.title);
    historySnapshotRef.current = pending;
    pendingStateRef.current = null;
  }, [commitChanges]);

  // Commit a discrete action synchronously, bypassing the debounce detection.
  // Called by task/team actions to ensure each action gets its own history entry,
  // even when multiple actions happen before React re-renders.
  // Also updates refs immediately so rapid consecutive calls see the correct "before" state.
  const commitDirect = useCallback((newTasks, currentTeams) => {
    const snap = historySnapshotRef.current;
    if (!snap.tasks) return;
    const currentTitle = projectTitleRef.current;
    commitChanges(snap, newTasks, currentTeams, currentTitle);
    tasksRef.current = newTasks;
    historySnapshotRef.current = { tasks: newTasks, teams: currentTeams, title: currentTitle };
  }, [commitChanges]);

  const commitTeamsDirect = useCallback((newTeams) => {
    const snap = historySnapshotRef.current;
    if (!snap.tasks) return;
    const currentTitle = projectTitleRef.current;
    commitChanges(snap, tasksRef.current, newTeams, currentTitle);
    teamsRef.current = newTeams;
    historySnapshotRef.current = { tasks: tasksRef.current, teams: newTeams, title: currentTitle };
  }, [commitChanges]);

  // Returns current tasks/teams synchronously (via refs) for use in discrete actions
  const getSnapshot = () => ({ tasks: tasksRef.current, teams: teamsRef.current });

  // Clear stacks on project switch
  useEffect(() => {
    if (prevProjectIdRef.current !== null && prevProjectIdRef.current !== projectId) {
      undoMetaRef.current = [];
      redoStackRef.current = [];
      historySnapshotRef.current = { tasks: null, teams: null, title: null };
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
      setVersion(v => v + 1);
    }
    prevProjectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    if (skipDetectionRef.current) {
      skipDetectionRef.current = false;
      historySnapshotRef.current = { tasks, teams, title: projectTitle };
      return;
    }

    if (historySnapshotRef.current.tasks === null) {
      historySnapshotRef.current = { tasks, teams, title: projectTitle };
      return;
    }

    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }

    pendingStateRef.current = { tasks, teams, title: projectTitle };
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const snap = historySnapshotRef.current;
      const pending = pendingStateRef.current;
      if (!snap.tasks || !pending) return;
      commitChanges(snap, pending.tasks, pending.teams, pending.title);
      historySnapshotRef.current = pending;
      pendingStateRef.current = null;
    }, DEBOUNCE_MS);
  }, [tasks, teams, projectTitle]);

  // Flush pending history on focus/beforeunload so entries aren't lost
  useEffect(() => {
    const handler = () => flushPending();
    window.addEventListener('beforeunload', handler);
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('focus', handler);
    };
  }, [flushPending]);

  const undo = useCallback(() => {
    flushPending();

    const meta = undoMetaRef.current;
    if (meta.length === 0) return;

    const { beforeSnapshot, entries } = meta[meta.length - 1];
    undoMetaRef.current = meta.slice(0, -1);

    const entryIds = new Set(entries.map(e => e.id));
    redoStackRef.current = [...redoStackRef.current, {
      afterSnapshot: { tasks: tasksRef.current, teams: teamsRef.current, title: projectTitleRef.current },
      entries,
    }];

    setHistory(prev => prev.filter(e => !entryIds.has(e.id)));
    onHistoryDeleteRef.current?.([...entryIds]);

    skipDetectionRef.current = true;
    setTasks(beforeSnapshot.tasks);
    setTeams(beforeSnapshot.teams);
    if (beforeSnapshot.title != null) setProjectTitle(beforeSnapshot.title);
    setVersion(v => v + 1);
  }, [setTasks, setTeams, setProjectTitle, setHistory, flushPending]);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;

    const { afterSnapshot, entries } = stack[stack.length - 1];
    redoStackRef.current = stack.slice(0, -1);

    undoMetaRef.current = [...undoMetaRef.current, {
      beforeSnapshot: { tasks: tasksRef.current, teams: teamsRef.current, title: projectTitleRef.current },
      entries,
    }];

    setHistory(prev => [...entries, ...prev]);
    onHistoryCommitRef.current?.(projectId, entries);

    skipDetectionRef.current = true;
    setTasks(afterSnapshot.tasks);
    setTeams(afterSnapshot.teams);
    if (afterSnapshot.title != null) setProjectTitle(afterSnapshot.title);
    setVersion(v => v + 1);
  }, [setTasks, setTeams, setProjectTitle, setHistory, projectId]);

  const suppressDetection = useCallback(() => {
    skipDetectionRef.current = true;
  }, []);

  const restoreToEntry = useCallback((entryId) => {
    flushPending();

    const meta = undoMetaRef.current;
    const groupIndex = meta.findIndex(m => m.entries.some(e => e.id === entryId));

    let targetState;
    let removedIds;

    if (groupIndex !== -1) {
      // Entry is in current session's undo stack — use fast snapshot-based restore
      targetState = groupIndex + 1 < meta.length
        ? meta[groupIndex + 1].beforeSnapshot
        : { tasks: tasksRef.current, teams: teamsRef.current, title: projectTitleRef.current };
      removedIds = meta.slice(groupIndex + 1).flatMap(m => m.entries.map(e => e.id));
      undoMetaRef.current = meta.slice(0, groupIndex + 1);
    } else {
      // Entry not in session (cross-session / cross-device) — reconstruct state
      // by reverse-applying all more-recent history entries from current state.
      const currentHistory = historyRef?.current ?? [];
      targetState = reconstructStateAt(entryId, currentHistory, { tasks: tasksRef.current, teams: teamsRef.current, title: projectTitleRef.current });
      if (!targetState) return;
      const targetIdx = currentHistory.findIndex(e => e.id === entryId);
      removedIds = currentHistory.slice(0, targetIdx).map(e => e.id);
      // Also include any current-session entries in undo meta
      const sessionIds = meta.flatMap(m => m.entries.map(e => e.id));
      removedIds = [...new Set([...removedIds, ...sessionIds])];
      undoMetaRef.current = [];
    }

    redoStackRef.current = [];

    if (removedIds.length > 0) {
      const removedSet = new Set(removedIds);
      setHistory(prev => prev.filter(e => !removedSet.has(e.id)));
      onHistoryDeleteRef.current?.(removedIds);
    }

    historySnapshotRef.current = targetState;
    skipDetectionRef.current = true;
    setTasks(targetState.tasks);
    setTeams(targetState.teams);
    if (targetState.title != null) setProjectTitle(targetState.title);
    setVersion(v => v + 1);
  }, [setTasks, setTeams, setProjectTitle, setHistory, flushPending]);

  // Returns true if restoring to this entry is guaranteed to produce a correct result.
  // In-session entries always work (snapshot-based). Cross-session entries work only
  // if every more-recent history entry can be fully reversed (deleted entries need _snapshot).
  const canRestoreEntry = useCallback((entryId) => {
    const currentHistory = historyRef?.current ?? [];
    const targetIdx = currentHistory.findIndex(e => e.id === entryId);
    if (targetIdx === -1) return false;
    // The most recent history entry is already the current state — no-op
    if (targetIdx === 0) return false;
    // In-session entries: check if in the last (most recent) group — also a no-op
    const meta = undoMetaRef.current;
    const groupIndex = meta.findIndex(m => m.entries.some(e => e.id === entryId));
    if (groupIndex !== -1) {
      if (groupIndex === meta.length - 1) return false; // last group = current state
      return true; // snapshot-based restore is always reliable
    }
    // Cross-session: all more-recent entries must be fully reversible
    for (let i = 0; i < targetIdx; i++) {
      const e = currentHistory[i];
      if (e.action === 'deleted' && !e.changes?._snapshot) return false;
    }
    return true;
  }, []);

  const canUndo = version >= 0 && undoMetaRef.current.length > 0;
  const canRedo = version >= 0 && redoStackRef.current.length > 0;
  const undoDepth = version >= 0 ? undoMetaRef.current.length : 0;

  return { undo, redo, canUndo, canRedo, undoDepth, suppressDetection, commitDirect, commitTeamsDirect, getSnapshot, flushPending, restoreToEntry, canRestoreEntry };
};
