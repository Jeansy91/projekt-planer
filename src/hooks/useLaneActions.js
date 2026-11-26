import { useCallback } from 'react';

export const useLaneActions = (setTeams, setTasks, flushPending, commitTeamsDirect, commitDirect, getSnapshot) => {
  const addLane = useCallback((teamId, laneName) => {
    if (!teamId || !laneName?.trim()) return null;
    flushPending();
    const { teams: currentTeams } = getSnapshot();
    const lane = { id: crypto.randomUUID(), name: laneName.trim() };
    const newTeams = currentTeams.map(t =>
      t.id === teamId ? { ...t, lanes: [...(t.lanes || []), lane] } : t
    );
    setTeams(newTeams);
    commitTeamsDirect(newTeams);
    return lane;
  }, [setTeams, flushPending, commitTeamsDirect, getSnapshot]);

  const deleteLane = useCallback((teamId, laneId) => {
    if (!teamId || !laneId) return;
    flushPending();
    const { tasks: currentTasks, teams: currentTeams } = getSnapshot();
    const newTeams = currentTeams.map(t =>
      t.id === teamId ? { ...t, lanes: (t.lanes || []).filter(l => l.id !== laneId) } : t
    );
    const newTasks = currentTasks.filter(t => t.laneId !== laneId);
    setTeams(newTeams);
    setTasks(newTasks);
    commitDirect(newTasks, newTeams);
  }, [setTeams, setTasks, flushPending, commitDirect, getSnapshot]);

  const renameLane = useCallback((teamId, laneId, newName) => {
    if (!teamId || !laneId || !newName?.trim()) return;
    flushPending();
    const { teams: currentTeams } = getSnapshot();
    const newTeams = currentTeams.map(t =>
      t.id === teamId
        ? { ...t, lanes: (t.lanes || []).map(l => l.id === laneId ? { ...l, name: newName.trim() } : l) }
        : t
    );
    setTeams(newTeams);
    commitTeamsDirect(newTeams);
  }, [setTeams, flushPending, commitTeamsDirect, getSnapshot]);

  const moveLane = useCallback((sourceTeamId, targetTeamId, laneId, targetIndex) => {
    if (!laneId) return;
    flushPending();
    const { tasks: currentTasks, teams: currentTeams } = getSnapshot();
    const sourceTeam = currentTeams.find(t => t.id === sourceTeamId);
    if (!sourceTeam) return;
    const lane = (sourceTeam.lanes || []).find(l => l.id === laneId);
    if (!lane) return;

    let newTeams;
    if (sourceTeamId === targetTeamId) {
      const lanes = (sourceTeam.lanes || []).filter(l => l.id !== laneId);
      const idx = Math.max(0, Math.min(lanes.length, targetIndex));
      lanes.splice(idx, 0, lane);
      newTeams = currentTeams.map(t => t.id === sourceTeamId ? { ...t, lanes } : t);
    } else {
      newTeams = currentTeams.map(t => {
        if (t.id === sourceTeamId) return { ...t, lanes: (t.lanes || []).filter(l => l.id !== laneId) };
        if (t.id === targetTeamId) {
          const lanes = [...(t.lanes || [])];
          const idx = Math.max(0, Math.min(lanes.length, targetIndex));
          lanes.splice(idx, 0, lane);
          return { ...t, lanes };
        }
        return t;
      });
    }

    setTeams(newTeams);

    if (sourceTeamId !== targetTeamId) {
      const newTasks = currentTasks.map(t =>
        t.laneId === laneId ? { ...t, teamId: targetTeamId } : t
      );
      setTasks(newTasks);
      commitDirect(newTasks, newTeams);
    } else {
      commitTeamsDirect(newTeams);
    }
  }, [setTeams, setTasks, flushPending, commitTeamsDirect, commitDirect, getSnapshot]);

  return { addLane, deleteLane, renameLane, moveLane };
};
