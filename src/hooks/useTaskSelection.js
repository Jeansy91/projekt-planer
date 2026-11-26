import { useState, useRef, useCallback } from 'react';
import { getTeamTasks, isLaneSelectionAdjacent } from '../utils/taskFilters';

export const useTaskSelection = (tasks) => {
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const selectionAnchorRef = useRef(null);

  const handleSelectTask = useCallback((taskId) => {
    selectionAnchorRef.current = taskId;
    setSelectedTaskIds([taskId]);
    setEditingTaskId(taskId);
  }, []);

  const handleSelectToggle = useCallback((taskId) => {
    selectionAnchorRef.current = taskId;
    setSelectedTaskIds(prev => {
      const newSelection = prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId];
      const clickedTask = tasks.find(t => t.id === taskId);
      return isLaneSelectionAdjacent(newSelection, clickedTask, tasks) ? newSelection : [taskId];
    });
  }, [tasks]);

  const handleShiftSelect = useCallback((taskId, addToExisting) => {
    const anchorId = selectionAnchorRef.current;
    if (!anchorId) { handleSelectTask(taskId); return; }

    const anchorTask = tasks.find(tk => tk.id === anchorId);
    const targetTask = tasks.find(tk => tk.id === taskId);
    if (!anchorTask || !targetTask) { handleSelectTask(taskId); return; }

    const anchorTeam = anchorTask.teamId || null;
    const targetTeam = targetTask.teamId || null;
    if (anchorTeam !== targetTeam) { handleSelectTask(taskId); return; }

    const teamTasks = getTeamTasks(tasks, anchorTeam);
    const anchorIdx = teamTasks.findIndex(tk => tk.id === anchorId);
    const targetIdx = teamTasks.findIndex(tk => tk.id === taskId);
    const start = Math.min(anchorIdx, targetIdx);
    const end = Math.max(anchorIdx, targetIdx);
    const rangeIds = teamTasks.slice(start, end + 1).map(tk => tk.id);

    if (addToExisting) {
      setSelectedTaskIds(prev => [...new Set([...prev, ...rangeIds])]);
    } else {
      setSelectedTaskIds(rangeIds);
    }
    setEditingTaskId(taskId);
  }, [tasks, handleSelectTask]);

  // Maps a click event's modifier keys to the right selection primitive.
  // Centralised so every Task-bar (Gantt, Lane, Staging) dispatches clicks
  // identically.
  const handleTaskClick = useCallback((e, taskId) => {
    e.stopPropagation();
    if (e.shiftKey && (e.ctrlKey || e.metaKey)) {
      handleShiftSelect(taskId, true);
    } else if (e.shiftKey) {
      handleShiftSelect(taskId, false);
    } else if (e.ctrlKey || e.metaKey) {
      handleSelectToggle(taskId);
    } else {
      handleSelectTask(taskId);
    }
  }, [handleSelectTask, handleSelectToggle, handleShiftSelect]);

  return {
    editingTaskId, setEditingTaskId,
    selectedTaskIds, setSelectedTaskIds,
    handleSelectTask, handleSelectToggle, handleShiftSelect, handleTaskClick,
  };
};
