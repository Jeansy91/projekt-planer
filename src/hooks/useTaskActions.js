import { useCallback } from 'react';
import { colors, STAGING_TASK_DURATION } from '../utils/constants';
import { compactStagingRow, getStagingTasks } from '../utils/staging';
import { getTeamTasks } from '../utils/taskFilters';

export const useTaskActions = (setTasks, flushPending, commitDirect, getSnapshot) => {
  const addTask = useCallback((title, viewStartDate, teamId = null, laneId = null) => {
    flushPending();
    const { tasks: currentTasks, teams } = getSnapshot();
    const maxPos = getTeamTasks(currentTasks, teamId).reduce((max, t) => Math.max(max, t.position ?? 0), -1);
    const newTask = {
      id: crypto.randomUUID(),
      title,
      startDate: viewStartDate.toISOString(),
      duration: 2,
      color: colors[currentTasks.length % colors.length],
      teamId,
      laneId,
      notes: '',
      position: maxPos + 1,
    };
    const newTasks = [...currentTasks, newTask];
    setTasks(newTasks);
    commitDirect(newTasks, teams);
    return newTask.id;
  }, [setTasks, flushPending, commitDirect, getSnapshot]);

  const addStagingTask = useCallback((title, teamId, viewStartDate) => {
    flushPending();
    const { tasks: currentTasks, teams } = getSnapshot();
    const staging = getStagingTasks(currentTasks, teamId);
    const maxPos = getTeamTasks(currentTasks, teamId).reduce((max, t) => Math.max(max, t.position ?? 0), -1);
    const newTask = {
      id: crypto.randomUUID(),
      title,
      startDate: new Date(viewStartDate).toISOString(),
      duration: STAGING_TASK_DURATION,
      color: colors[currentTasks.length % colors.length],
      teamId,
      laneId: null,
      notes: '',
      position: maxPos + 1,
    };
    const anchor = staging[0]?.startDate ?? new Date(viewStartDate).toISOString();
    const compacted = compactStagingRow([...staging, newTask], anchor);
    const compactedMap = new Map(compacted.map(c => [c.id, c.startDate]));
    const newTasks = [...currentTasks, newTask].map(t =>
      compactedMap.has(t.id) ? { ...t, startDate: compactedMap.get(t.id) } : t
    );
    setTasks(newTasks);
    commitDirect(newTasks, teams);
  }, [setTasks, flushPending, commitDirect, getSnapshot]);

  const updateTask = useCallback((id, updates) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
  }, [setTasks]);

  const deleteTask = useCallback((id) => {
    flushPending();
    const { tasks: currentTasks, teams } = getSnapshot();
    const newTasks = currentTasks.filter(t => t.id !== id);
    setTasks(newTasks);
    commitDirect(newTasks, teams);
  }, [setTasks, flushPending, commitDirect, getSnapshot]);

  const duplicateTasks = useCallback((taskIds) => {
    flushPending();
    const { tasks: currentTasks, teams } = getSnapshot();
    const toDuplicate = currentTasks.filter(t => taskIds.includes(t.id));
    if (toDuplicate.length === 0) return [];
    const maxPosByTeam = new Map(
      [...new Set(toDuplicate.map(t => t.teamId))].map(teamId => [
        teamId,
        getTeamTasks(currentTasks, teamId).reduce((max, t) => Math.max(max, t.position ?? 0), -1),
      ])
    );
    const newIds = [];
    const duplicates = toDuplicate.map((t) => {
      const newId = crypto.randomUUID();
      newIds.push(newId);
      const pos = (maxPosByTeam.get(t.teamId) ?? -1) + 1;
      maxPosByTeam.set(t.teamId, pos);
      return { ...t, id: newId, laneId: null, position: pos };
    });
    const newTasks = [...currentTasks, ...duplicates];
    setTasks(newTasks);
    commitDirect(newTasks, teams);
    return newIds;
  }, [setTasks, flushPending, commitDirect, getSnapshot]);

  return { addTask, addStagingTask, updateTask, deleteTask, duplicateTasks };
};
