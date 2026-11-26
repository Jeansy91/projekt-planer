import { useState, useCallback, useRef, useEffect } from 'react';
import { useProjectState } from './useProjectState';
import { useTaskActions } from './useTaskActions';
import { useTeamActions } from './useTeamActions';
import { useLaneActions } from './useLaneActions';
import { useProjectLifecycle } from './useProjectLifecycle';
import { useUndoRedo } from './useUndoRedo';

export const useProjectStore = (externalSetters = {}) => {
  // Project shape (id, title, tasks, teams) per ADR-0002.
  const {
    projectId, setProjectId,
    projectTitle, setProjectTitle,
    tasks, setTasks,
    teams, setTeams,
    replaceProject,
  } = useProjectState();

  // Density is per-user, not part of Project (ADR-0002). Lives here because the
  // store wires it through the lifecycle; loaded/saved by useUserDensity.
  const [density, setDensity] = useState(0);
  const [fileHandle, setFileHandle] = useState(null);

  // Persistence meta
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isFileSystemApiSupported, setIsFileSystemApiSupported] = useState(false);
  const initialLoadDone = useRef(false);

  // History — owned here; ref kept in sync for callers that need the latest value without re-rendering.
  const [history, setHistory] = useState([]);
  const historyRef = useRef(history);
  useEffect(() => { historyRef.current = history; }, [history]);

  // View setters come from useProjectView in App.jsx so the lifecycle can drive
  // them on project open / new / import. See useProjectView.js.
  const {
    user, onHistoryCommit, onHistoryDelete,
    setViewStartDate, setWeeksShown, setUnassignedCollapsed,
  } = externalSetters;
  const { undo, redo, canUndo, canRedo, undoDepth, suppressDetection, commitDirect, commitTeamsDirect, getSnapshot, flushPending, restoreToEntry, canRestoreEntry } = useUndoRedo(tasks, teams, setTasks, setTeams, projectId, projectTitle, setProjectTitle, setHistory, user, onHistoryCommit, onHistoryDelete, historyRef);

  const taskActions = useTaskActions(setTasks, flushPending, commitDirect, getSnapshot);
  const teamActions = useTeamActions(setTeams, setTasks, flushPending, commitTeamsDirect, commitDirect, getSnapshot);
  const laneActions = useLaneActions(setTeams, setTasks, flushPending, commitTeamsDirect, commitDirect, getSnapshot);
  const lifecycle = useProjectLifecycle({
    replaceProject,
    setHistory,
    setViewStartDate, setWeeksShown, setDensity, setUnassignedCollapsed,
    setFileHandle,
  });

  // Wrap exportProject to bind current state (optional history array).
  const exportProject = useCallback((history) => {
    lifecycle.exportProject(projectTitle, tasks, teams, history);
  }, [lifecycle.exportProject, projectTitle, tasks, teams]);

  // Boot: detect File System API support; defer initialLoadDone flip one macrotask so the initial
  // state population doesn't trigger an autosave in usePersistence.
  useEffect(() => {
    setIsFileSystemApiSupported('showOpenFilePicker' in window);
    setTimeout(() => { initialLoadDone.current = true; }, 0);
  }, []);

  return {
    // State
    projectId, setProjectId, projectTitle, setProjectTitle,
    tasks, setTasks,
    teams, setTeams,
    density, setDensity,
    fileHandle, setFileHandle, saveStatus, setSaveStatus, isFileSystemApiSupported,
    initialLoadDone,

    // History
    history, setHistory, historyRef,

    // Task actions
    ...taskActions,

    // Team actions
    ...teamActions,

    // Lane actions
    ...laneActions,

    // Undo/redo
    undo, redo, canUndo, canRedo, undoDepth, suppressDetection, flushPending, commitDirect, getSnapshot, restoreToEntry, canRestoreEntry,

    // Project lifecycle
    newProject: lifecycle.newProject,
    openProject: lifecycle.openProject,
    openFile: lifecycle.openFile,
    importFromJson: lifecycle.importFromJson,
    exportProject,
    deleteProject: lifecycle.deleteProject,
    getProjectList: lifecycle.getProjectList,
  };
};
