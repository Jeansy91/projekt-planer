/** Map a single Supabase task row to local state shape. */
export const fromDbTask = (row) => ({
  id: row.id,
  title: row.title,
  startDate: row.start_date,
  duration: row.duration,
  color: row.color,
  teamId: row.team_id,
  laneId: row.lane_id,
  notes: row.notes || '',
  position: row.position ?? 0,
});

/** Map a single Supabase team row to local state shape (without lanes). */
export const fromDbTeam = (row) => ({
  id: row.id,
  name: row.name,
  color: row.color,
  icon: row.icon,
  viewMode: row.view_mode,
  collapsed: row.collapsed,
  position: row.position,
});

/** Map a single Supabase lane row to local state shape. */
export const fromDbLane = (row) => ({
  id: row.id,
  teamId: row.team_id,
  name: row.name,
  position: row.position,
});

/** Map Supabase team + lane rows to local teams array (sorted, with nested lanes). */
export const fromDbTeams = (dbTeams, dbLanes) =>
  dbTeams
    .sort((a, b) => a.position - b.position)
    .map(t => ({
      ...fromDbTeam(t),
      lanes: dbLanes
        .filter(l => l.team_id === t.id)
        .sort((a, b) => a.position - b.position)
        .map(l => ({ id: l.id, name: l.name })),
    }));

/** Map Supabase task rows to local tasks array (sorted by position). */
export const fromDbTasks = (dbTasks) =>
  dbTasks
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(fromDbTask);
