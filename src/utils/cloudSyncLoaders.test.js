import { describe, it, expect } from 'vitest';
import { createResyncLoader } from './cloudSyncLoaders';
import { fromDbTask, fromDbTeam } from './supabaseMappers';

// Stub supabase client — chainable query builder over in-memory tables.
const makeStubSupabase = (tables) => {
  const build = (table) => {
    let rows = tables[table] || [];
    const filters = [];
    const api = {
      select: () => api,
      eq: (col, val) => { filters.push(r => r[col] === val); return api; },
      in: (col, vals) => { filters.push(r => vals.includes(r[col])); return api; },
      single: async () => {
        const filtered = rows.filter(r => filters.every(f => f(r)));
        return { data: filtered[0] || null, error: null };
      },
      then: (resolve) => {
        const filtered = rows.filter(r => filters.every(f => f(r)));
        resolve({ data: filtered, error: null });
      },
    };
    return api;
  };
  return { from: build };
};

describe('createResyncLoader', () => {
  it('returns null when projectId is missing', async () => {
    const load = createResyncLoader({
      supabase: makeStubSupabase({}),
      mappers: { fromDbTask, fromDbTeam },
    });
    expect(await load(null)).toBeNull();
  });

  it('fetches tasks, teams, lanes, and title and shapes them for the coordinator', async () => {
    const supabase = makeStubSupabase({
      tasks: [
        { id: 't2', title: 'B', start_date: '2026-01-12', duration: 1, color: 'r', team_id: 'tm1', lane_id: null, notes: '', position: 1, project_id: 'p1' },
        { id: 't1', title: 'A', start_date: '2026-01-05', duration: 2, color: 'b', team_id: 'tm1', lane_id: 'l1', notes: '', position: 0, project_id: 'p1' },
      ],
      teams: [
        { id: 'tm2', name: 'Beta', color: 'g', icon: null, view_mode: 'gantt', collapsed: false, position: 1, project_id: 'p1' },
        { id: 'tm1', name: 'Alpha', color: 'b', icon: null, view_mode: 'gantt', collapsed: false, position: 0, project_id: 'p1' },
      ],
      lanes: [
        { id: 'l2', team_id: 'tm1', name: 'Lane 2', position: 1 },
        { id: 'l1', team_id: 'tm1', name: 'Lane 1', position: 0 },
      ],
      projects: [{ id: 'p1', title: 'My project' }],
    });

    const load = createResyncLoader({ supabase, mappers: { fromDbTask, fromDbTeam } });
    const result = await load('p1');

    expect(result.title).toBe('My project');
    expect(result.tasks.map(t => t.id)).toEqual(['t1', 't2']); // sorted by position
    expect(result.teams.map(t => t.id)).toEqual(['tm1', 'tm2']); // sorted by position
    expect(result.teams[0].lanes.map(l => l.id)).toEqual(['l1', 'l2']); // sorted by position
    // Lanes only carry the trimmed shape consumed by the coordinator.
    expect(result.teams[0].lanes[0]).toEqual({ id: 'l1', name: 'Lane 1', position: 0 });
  });

  it('returns null and warns when any base query errors', async () => {
    const erroring = { data: null, error: { message: 'boom' } };
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => erroring,
            then: (r) => r(erroring),
          }),
        }),
      }),
    };
    const load = createResyncLoader({ supabase, mappers: { fromDbTask, fromDbTeam } });
    expect(await load('p1')).toBeNull();
  });
});
