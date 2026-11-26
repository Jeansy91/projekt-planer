import { LEGACY_COLOR_MAP } from './constants';

// Project intake validator — the single seam through which local-origin project
// data enters application state (localStorage open, file open, JSON import).
// Returns a fully-shaped, sanitized Project value:
//   - orphaned teamId / laneId references on Tasks are nulled
//   - legacy color names are migrated on Tasks and Teams
//   - missing fields receive defaults
//   - per-user fields (viewStartDate, weeksShown, density) are NOT part of a
//     Project (see ADR-0002) and are excluded from the output
//
// Resync is NOT routed through here — the DB is the authoritative source and
// has its own integrity logic (see Suspicious bulk delete in docs/glossary.md).

const migrateColor = (color) => LEGACY_COLOR_MAP[color] || color;

const validateTeams = (rawTeams) =>
  (rawTeams || []).map(t => {
    const newColor = migrateColor(t.color);
    return newColor !== t.color ? { ...t, color: newColor } : t;
  });

const validateTasks = (rawTasks, teams) => {
  const teamIds = new Set(teams.map(t => t.id));
  const laneIds = new Set(teams.flatMap(t => (t.lanes || []).map(l => l.id)));
  return (rawTasks || []).map(t => {
    let updated = t;
    const newColor = migrateColor(t.color);
    if (newColor !== t.color) {
      updated = { ...updated, color: newColor };
    }
    if (t.teamId && !teamIds.has(t.teamId)) {
      updated = { ...updated, teamId: null, laneId: null };
    }
    if (t.laneId && !laneIds.has(t.laneId)) {
      updated = { ...updated, laneId: null };
    }
    return updated;
  });
};

export const validateProject = (raw, { fallbackTitle = '' } = {}) => {
  const teams = validateTeams(raw.teams);
  const tasks = validateTasks(raw.tasks, teams);
  return {
    id: raw.id || crypto.randomUUID(),
    title: raw.title || raw.projectTitle || fallbackTitle,
    teams,
    tasks,
    unassignedGroupCollapsed: raw.unassignedGroupCollapsed || false,
    history: raw.history || [],
  };
};
