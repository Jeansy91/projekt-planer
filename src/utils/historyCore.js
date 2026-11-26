import { extractPlainText } from './notesUtils.js';

// History entry schema — the single source of truth for what a history entry is.
//
// A History entry records one observable change to the Project. It is shaped so
// it round-trips through the cloud (camelCase here, snake_case in DB), survives
// session boundaries, and can be reverse-applied to reconstruct past state.
//
// Shape:
//   {
//     id: string (uuid),
//     timestamp: string (ISO),
//     userId: string | null,
//     action: 'created' | 'updated' | 'deleted' | 'moved' | 'resized',
//     entityType: 'task' | 'team' | 'lane' | 'project',
//     entityId: string,
//     entityName: string,
//     changes: { [field]: { from, to } } | { _snapshot: {...} } | null,
//   }
//
// `changes._snapshot` is required on 'deleted' entries to make them reversible
// cross-session (`reconstructStateAt` reads it to re-materialize the entity).

export const TRACKED_TASK_FIELDS = ['title', 'notes', 'color', 'teamId', 'laneId'];
const TRACKED_TEAM_FIELDS = ['name', 'color', 'icon', 'viewMode'];

// Diff two Project snapshots → raw history entries (no id/timestamp/userId yet).
// Snapshot = { tasks, teams, title }. `projectId` is needed because title
// changes record the Project entity itself.
export const detectChanges = (prev, next, { projectId } = {}) => {
  const entries = [];

  const prevTaskMap = new Map(prev.tasks.map(t => [t.id, t]));
  const nextTaskMap = new Map(next.tasks.map(t => [t.id, t]));
  const prevTeamMap = new Map(prev.teams.map(t => [t.id, t]));
  const nextTeamMap = new Map(next.teams.map(t => [t.id, t]));

  for (const task of next.tasks) {
    if (!prevTaskMap.has(task.id)) {
      entries.push({ action: 'created', entityType: 'task', entityId: task.id, entityName: task.title });
    }
  }

  for (const task of prev.tasks) {
    if (!nextTaskMap.has(task.id)) {
      entries.push({
        action: 'deleted', entityType: 'task', entityId: task.id, entityName: task.title,
        changes: { _snapshot: { id: task.id, title: task.title, startDate: task.startDate, duration: task.duration, color: task.color, teamId: task.teamId, laneId: task.laneId, notes: task.notes, position: task.position } },
      });
    }
  }

  for (const nextTask of next.tasks) {
    const prevTask = prevTaskMap.get(nextTask.id);
    if (!prevTask) continue;
    const changes = {};

    if (prevTask.startDate !== nextTask.startDate) {
      changes.startDate = { from: prevTask.startDate, to: nextTask.startDate };
    }
    if (prevTask.duration !== nextTask.duration) {
      changes.duration = { from: prevTask.duration, to: nextTask.duration };
    }
    for (const key of TRACKED_TASK_FIELDS) {
      if (prevTask[key] !== nextTask[key]) {
        if (key === 'notes') {
          changes[key] = { from: extractPlainText(prevTask[key], '\n'), to: extractPlainText(nextTask[key], '\n') };
        } else {
          changes[key] = { from: prevTask[key], to: nextTask[key] };
        }
      }
    }

    if (Object.keys(changes).length > 0) {
      const changedKeys = Object.keys(changes);
      const isOnlyPosition = changedKeys.every(k => k === 'startDate' || k === 'duration');
      let action = 'updated';
      if (isOnlyPosition) {
        const hasStart = changedKeys.includes('startDate');
        const hasDuration = changedKeys.includes('duration');
        if (hasDuration) action = 'resized';
        else if (hasStart) action = 'moved';
      }
      // Moves into a swimlane team's "unassigned" lane are not tracked.
      if (action === 'moved' && nextTask.laneId === null && nextTask.teamId !== null) {
        const team = nextTeamMap.get(nextTask.teamId);
        if (team?.viewMode === 'swimlane') continue;
      }
      entries.push({ action, entityType: 'task', entityId: nextTask.id, entityName: nextTask.title, changes });
    }
  }

  for (const team of next.teams) {
    if (!prevTeamMap.has(team.id)) {
      entries.push({ action: 'created', entityType: 'team', entityId: team.id, entityName: team.name });
    }
  }

  for (const team of prev.teams) {
    if (!nextTeamMap.has(team.id)) {
      entries.push({
        action: 'deleted', entityType: 'team', entityId: team.id, entityName: team.name,
        changes: { _snapshot: { id: team.id, name: team.name, color: team.color, icon: team.icon, viewMode: team.viewMode, lanes: team.lanes || [] } },
      });
    }
  }

  for (const nextTeam of next.teams) {
    const prevTeam = prevTeamMap.get(nextTeam.id);
    if (!prevTeam) continue;

    const changes = {};
    for (const key of TRACKED_TEAM_FIELDS) {
      if (prevTeam[key] !== nextTeam[key]) changes[key] = { from: prevTeam[key], to: nextTeam[key] };
    }
    if (Object.keys(changes).length > 0) {
      entries.push({ action: 'updated', entityType: 'team', entityId: nextTeam.id, entityName: nextTeam.name, changes });
    }

    const prevLaneMap = new Map((prevTeam.lanes || []).map(l => [l.id, l]));
    const nextLaneMap = new Map((nextTeam.lanes || []).map(l => [l.id, l]));

    for (const lane of (nextTeam.lanes || [])) {
      if (!prevLaneMap.has(lane.id)) {
        entries.push({ action: 'created', entityType: 'lane', entityId: lane.id, entityName: lane.name });
      }
    }
    for (const lane of (prevTeam.lanes || [])) {
      if (!nextLaneMap.has(lane.id)) {
        entries.push({
          action: 'deleted', entityType: 'lane', entityId: lane.id, entityName: lane.name,
          changes: { _snapshot: { id: lane.id, name: lane.name, teamId: prevTeam.id } },
        });
      }
    }
    for (const nextLane of (nextTeam.lanes || [])) {
      const prevLane = prevLaneMap.get(nextLane.id);
      if (!prevLane || prevLane.name === nextLane.name) continue;
      entries.push({
        action: 'updated', entityType: 'lane', entityId: nextLane.id, entityName: nextLane.name,
        changes: { name: { from: prevLane.name, to: nextLane.name } },
      });
    }
  }

  // Project-title diff. `prev.title === null` means the snapshot was set before
  // a title was known — skip, otherwise the first load would produce a spurious
  // "title changed from null to …" entry.
  if (prev.title !== null && prev.title !== next.title && projectId) {
    entries.push({
      action: 'updated',
      entityType: 'project',
      entityId: projectId,
      entityName: next.title,
      changes: { title: { from: prev.title, to: next.title } },
    });
  }

  return entries;
};

// Assign id/timestamp/userId to raw entries. Pure given `now`.
export const stampEntries = (rawEntries, { userId, now } = {}) => {
  const ts = now ?? new Date().toISOString();
  return rawEntries.map(e => ({
    id: crypto.randomUUID(),
    timestamp: ts,
    userId: userId ?? null,
    ...e,
  }));
};

// Reconstruct project state at a specific history entry by reverse-applying
// all more recent entries from the current state. Works cross-session because
// it relies only on persisted history entries (not in-memory snapshots).
// `currentSnapshot` = { tasks, teams, title }. Returns the same shape or null.
export const reconstructStateAt = (targetEntryId, history, currentSnapshot) => {
  const targetIdx = history.findIndex(e => e.id === targetEntryId);
  if (targetIdx === -1) return null;

  let tasks = [...currentSnapshot.tasks];
  let teams = [...currentSnapshot.teams];
  let title = currentSnapshot.title ?? null;
  const taskIds = new Set(tasks.map(t => t.id));
  const teamIds = new Set(teams.map(t => t.id));

  for (let i = 0; i < targetIdx; i++) {
    const entry = history[i];
    if (entry.entityType === 'task') {
      if (entry.action === 'created') {
        tasks = tasks.filter(t => t.id !== entry.entityId);
        taskIds.delete(entry.entityId);
      } else if (entry.action === 'deleted') {
        const snapshot = entry.changes?._snapshot;
        if (snapshot && !taskIds.has(snapshot.id)) { tasks = [...tasks, snapshot]; taskIds.add(snapshot.id); }
      } else {
        tasks = tasks.map(t => {
          if (t.id !== entry.entityId) return t;
          const reverted = { ...t };
          for (const [field, change] of Object.entries(entry.changes || {})) {
            if (field !== '_snapshot' && change && 'from' in change) reverted[field] = change.from;
          }
          return reverted;
        });
      }
    } else if (entry.entityType === 'team') {
      if (entry.action === 'created') {
        teams = teams.filter(t => t.id !== entry.entityId);
        teamIds.delete(entry.entityId);
      } else if (entry.action === 'deleted') {
        const snapshot = entry.changes?._snapshot;
        if (snapshot && !teamIds.has(snapshot.id)) { teams = [...teams, snapshot]; teamIds.add(snapshot.id); }
      } else {
        teams = teams.map(t => {
          if (t.id !== entry.entityId) return t;
          const reverted = { ...t };
          for (const [field, change] of Object.entries(entry.changes || {})) {
            if (field !== '_snapshot' && change && 'from' in change) reverted[field] = change.from;
          }
          return reverted;
        });
      }
    } else if (entry.entityType === 'project' && entry.action === 'updated') {
      const from = entry.changes?.title?.from;
      if (from !== undefined) title = from;
    }
  }

  return { tasks, teams, title };
};
