import { useCallback } from 'react';

export const useTeamActions = (setTeams, setTasks, flushPending, commitTeamsDirect, commitDirect, getSnapshot) => {
  const addTeam = useCallback((name, viewMode = 'gantt') => {
    flushPending();
    const { teams: currentTeams } = getSnapshot();
    const t = { id: crypto.randomUUID(), name, collapsed: false, viewMode, lanes: [], color: 'blue', icon: 'users' };
    const newTeams = [...currentTeams, t];
    setTeams(newTeams);
    commitTeamsDirect(newTeams);
    return t;
  }, [setTeams, flushPending, commitTeamsDirect, getSnapshot]);

  const updateTeam = useCallback((teamId, updates) => {
    if (!teamId) return;
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, ...updates } : t));
  }, [setTeams]);

  const deleteTeam = useCallback((teamId) => {
    if (!teamId) return;
    flushPending();
    const { tasks: currentTasks, teams: currentTeams } = getSnapshot();
    const newTeams = currentTeams.filter(t => t.id !== teamId);
    const newTasks = currentTasks.filter(t => t.teamId !== teamId);
    setTeams(newTeams);
    setTasks(newTasks);
    commitDirect(newTasks, newTeams);
  }, [setTeams, setTasks, flushPending, commitDirect, getSnapshot]);

  const toggleCollapse = useCallback((id) => {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, collapsed: !t.collapsed } : t));
  }, [setTeams]);

  const renameTeam = useCallback((teamId, newName) => {
    if (!teamId || !newName?.trim()) return;
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, name: newName.trim() } : t));
  }, [setTeams]);

  const moveTeamUp = useCallback((teamId) => {
    setTeams(prev => {
      const idx = prev.findIndex(t => t.id === teamId);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, [setTeams]);

  const moveTeamDown = useCallback((teamId) => {
    setTeams(prev => {
      const idx = prev.findIndex(t => t.id === teamId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, [setTeams]);

  const setTeamViewMode = useCallback((teamId, viewMode) => {
    if (!teamId) return;
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, viewMode } : t));
  }, [setTeams]);

  return { addTeam, updateTeam, deleteTeam, toggleCollapse, renameTeam, moveTeamUp, moveTeamDown, setTeamViewMode };
};
