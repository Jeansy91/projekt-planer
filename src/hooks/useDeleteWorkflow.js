import { useState, useCallback } from 'react';
import { compactStagingRow, getStagingTasks } from '../utils/staging';

export const useDeleteWorkflow = (tasks, teams, setTasks, editingTaskId, setEditingTaskId, deleteTask, viewStartDateIso) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetType, setDeleteTargetType] = useState(null);

  const requestDeleteTask = useCallback((taskId) => {
    setDeleteTargetId(taskId);
    setDeleteTargetType('task');
    setShowDeleteConfirm(true);
  }, []);

  const requestDeleteTeam = useCallback((teamId) => {
    setDeleteTargetId(teamId);
    setDeleteTargetType('team');
    setShowDeleteConfirm(true);
  }, []);

  const requestDeleteTasks = useCallback((taskIds) => {
    setDeleteTargetId(taskIds);
    setDeleteTargetType('tasks');
    setShowDeleteConfirm(true);
  }, []);

  const cancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeleteTargetId(null);
    setDeleteTargetType(null);
  }, []);

  const deleteTaskWithCompact = useCallback((taskId) => {
    const deletedTask = tasks.find(tk => tk.id === taskId);
    deleteTask(taskId);
    if (editingTaskId === taskId) setEditingTaskId(null);

    if (deletedTask && !deletedTask.laneId && deletedTask.teamId) {
      const team = teams.find(tm => tm.id === deletedTask.teamId);
      if (team && team.viewMode === 'swimlane') {
        setTasks(prev => {
          const staging = getStagingTasks(prev, deletedTask.teamId);
          if (staging.length === 0) return prev;
          const compacted = compactStagingRow(staging, viewStartDateIso);
          const updateMap = new Map(compacted.map(c => [c.id, c.startDate]));
          return prev.map(tk => updateMap.has(tk.id) ? { ...tk, startDate: updateMap.get(tk.id) } : tk);
        });
      }
    }
  }, [tasks, teams, editingTaskId, setEditingTaskId, deleteTask, setTasks, viewStartDateIso]);

  return {
    showDeleteConfirm, deleteTargetId, deleteTargetType,
    requestDeleteTask, requestDeleteTeam, requestDeleteTasks,
    cancelDelete, deleteTaskWithCompact
  };
};
