// Pure logic for Cloud sync — no React, no Supabase. Lives separately so it can be
// unit-tested and reused across useCloudSync, useRealtimeChannel handlers, and resync.
//
// See docs/glossary.md ("Sync" section) for the Fingerprint / Pending flush / Echo terminology.

// Stable, deterministic serialization. Two equivalent payloads (same fields, same values,
// any property order) produce the same string. This is the input to Echo filtering.
export const fingerprint = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(fingerprint).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + fingerprint(value[k])).join(',') + '}';
};

const stripVolatile = (task) => {
  // Strip transient client-side fields that should never participate in equality.
  // None today, but keeping the seam open.
  return task;
};

export const diffTasks = (synced, current) => {
  const addSet = new Map(current.map(t => [t.id, t]));
  const subSet = new Map(synced.map(t => [t.id, t]));
  return {
    added: current.filter(t => !subSet.has(t.id)),
    removed: synced.filter(t => !addSet.has(t.id)),
    updated: current.filter(t => {
      const old = subSet.get(t.id);
      return old && fingerprint(stripVolatile(old)) !== fingerprint(stripVolatile(t));
    }),
  };
};

const stripLanesAndCollapsed = ({ lanes, collapsed, ...rest }) => rest;

const collectLanes = (teams) => {
  const map = new Map();
  teams.forEach(t => (t.lanes || []).forEach((l, i) =>
    map.set(l.id, { id: l.id, name: l.name, teamId: t.id, position: i })
  ));
  return map;
};

export const diffTeamsAndLanes = (prev, current) => {
  const prevById = new Map(prev.map(t => [t.id, t]));
  const currById = new Map(current.map(t => [t.id, t]));

  const addedTeams = current.filter(t => !prevById.has(t.id));
  const removedTeams = prev.filter(t => !currById.has(t.id));
  const updatedTeams = current.filter(t => {
    const old = prevById.get(t.id);
    return old && fingerprint(stripLanesAndCollapsed(old)) !== fingerprint(stripLanesAndCollapsed(t));
  });

  const prevOrder = prev.map(t => t.id).join(',');
  const currOrder = current.map(t => t.id).join(',');
  const reordered = prev.length > 0 && prev.length === current.length
    && prevOrder !== currOrder && addedTeams.length === 0 && removedTeams.length === 0;

  const prevLanes = collectLanes(prev);
  const currLanes = collectLanes(current);

  return {
    addedTeams,
    removedTeams,
    updatedTeams,
    reordered,
    addedLanes: [...currLanes.values()].filter(l => !prevLanes.has(l.id)),
    removedLanes: [...prevLanes.values()].filter(l => !currLanes.has(l.id)),
    updatedLanes: [...currLanes.values()].filter(l => {
      const old = prevLanes.get(l.id);
      return old && fingerprint(old) !== fingerprint(l);
    }),
  };
};

// See docs/glossary.md → "Suspicious bulk delete". Refuses diffs that would wipe most of
// the previous structure with no compensating adds. Almost always indicates state
// corruption (partial DB read overwriting local state) rather than user intent.
export const BULK_DELETE_RATIO = 0.5;
export const BULK_DELETE_MIN = 3;

export const isSuspiciousBulkDelete = (diff, prevTeams) => {
  const prevTeamCount = prevTeams.length;
  const prevLaneCount = prevTeams.reduce((sum, t) => sum + (t.lanes?.length || 0), 0);

  const teamWipe = diff.removedTeams.length >= BULK_DELETE_MIN
    && prevTeamCount > 0
    && diff.removedTeams.length / prevTeamCount >= BULK_DELETE_RATIO
    && diff.addedTeams.length === 0;

  const laneWipe = diff.removedLanes.length >= BULK_DELETE_MIN
    && prevLaneCount > 0
    && diff.removedLanes.length / prevLaneCount >= BULK_DELETE_RATIO
    && diff.addedLanes.length === 0;

  return teamWipe || laneWipe;
};
