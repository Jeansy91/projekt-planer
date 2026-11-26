// Pure loaders for Cloud sync. Decoupled from React so the Resync data path
// can be tested against an in-memory supabase stub.
//
// createResyncLoader({ supabase, mappers }) returns fetchAll(projectId) which
// fetches Tasks, Teams, Lanes, and the Project title in the shape the Cloud
// sync coordinator expects from coordinator.resync({ fetchAll }).

export const createResyncLoader = ({ supabase, mappers }) => {
  const { fromDbTask, fromDbTeam } = mappers;

  return async (projectId) => {
    if (!supabase || !projectId) return null;

    const [tasksRes, teamsRes, projectRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('project_id', projectId),
      supabase.from('teams').select('*').eq('project_id', projectId),
      supabase.from('projects').select('*').eq('id', projectId).single(),
    ]);

    if (tasksRes.error || teamsRes.error || projectRes.error) {
      console.warn('[CloudSync] Resync aborted — query error:',
        tasksRes.error?.message || teamsRes.error?.message || projectRes.error?.message);
      return null;
    }

    const dbTasks = tasksRes.data;
    const dbTeams = teamsRes.data;
    const project = projectRes.data;

    const teamIds = (dbTeams || []).map(t => t.id);
    let dbLanes = [];
    if (teamIds.length > 0) {
      const lanesRes = await supabase.from('lanes').select('*').in('team_id', teamIds);
      if (lanesRes.error) {
        console.warn('[CloudSync] Resync aborted — lanes query error:', lanesRes.error.message);
        return null;
      }
      dbLanes = lanesRes.data || [];
    }

    const nextTasks = dbTasks
      ? dbTasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(fromDbTask)
      : null;
    const nextTeams = dbTeams
      ? dbTeams
        .sort((a, b) => a.position - b.position)
        .map(t => ({
          ...fromDbTeam(t),
          lanes: dbLanes
            .filter(l => l.team_id === t.id)
            .sort((a, b) => a.position - b.position)
            .map(l => ({ id: l.id, name: l.name, position: l.position })),
        }))
      : null;

    return { tasks: nextTasks, teams: nextTeams, title: project?.title ?? null };
  };
};
