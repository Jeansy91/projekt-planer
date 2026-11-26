import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCloudSyncCoordinator } from './cloudSyncCoordinator';

// Stub sbProject — records ops; resolves immediately.
const makeStubProject = () => {
  const calls = [];
  return {
    calls,
    upsertTask: vi.fn(async (t, pid) => { calls.push(['upsertTask', t, pid]); }),
    removeTask: vi.fn(async (id) => { calls.push(['removeTask', id]); }),
    upsertTeam: vi.fn(async (t, pid, pos) => { calls.push(['upsertTeam', t, pid, pos]); }),
    removeTeam: vi.fn(async (id) => { calls.push(['removeTeam', id]); }),
    upsertLane: vi.fn(async (l, tid, pos) => { calls.push(['upsertLane', l, tid, pos]); }),
    removeLane: vi.fn(async (id) => { calls.push(['removeLane', id]); }),
    updateProjectSettings: vi.fn(async (pid, settings) => { calls.push(['updateProjectSettings', pid, settings]); }),
  };
};

const makeInMemoryMutators = () => {
  let tasks = [];
  let teams = [];
  let title = '';
  return {
    state: () => ({ tasks, teams, title }),
    applyTasks: (fn) => { tasks = fn(tasks); },
    applyTeams: (fn) => { teams = fn(teams); },
    applyTitle: (value) => { title = value; },
    seed: ({ tasks: t, teams: tm, title: ti }) => {
      if (t) tasks = t;
      if (tm) teams = tm;
      if (ti !== undefined) title = ti;
    },
  };
};

const flush = () => new Promise(resolve => setTimeout(resolve, 250));

describe('cloudSyncCoordinator — Echo filter', () => {
  let coord, sbProject, mutators, suppressDetection;

  beforeEach(() => {
    sbProject = makeStubProject();
    mutators = makeInMemoryMutators();
    suppressDetection = vi.fn();
    coord = createCloudSyncCoordinator({
      sbProject,
      mutators: { applyTasks: mutators.applyTasks, applyTeams: mutators.applyTeams, applyTitle: mutators.applyTitle },
      suppressDetection,
    });
    coord.setProjectId('P1');
  });

  it('should_drop_echo_when_remote_task_event_matches_pending_flush', async () => {
    // Hold the upsert pending so the registry entry survives long enough for
    // the simulated echo to arrive — this is the realistic race window.
    let resolveUpsert;
    sbProject.upsertTask.mockImplementation(() => new Promise(r => { resolveUpsert = r; }));

    const t = { id: 'task1', title: 'A', startDate: '2026-01-05', duration: 1, color: 'blue', teamId: null, laneId: null, position: 0 };
    const t2 = { id: 'task2', title: 'B', startDate: '2026-01-05', duration: 1, color: 'blue', teamId: null, laneId: null, position: 0 };
    mutators.seed({ tasks: [t] });
    coord.noteLocalChange('task', [t]);              // first-seen baseline
    coord.noteLocalChange('task', [t, t2]);          // schedules flush
    await new Promise(r => setTimeout(r, 200));      // let debounce fire; upsert now pending

    // Echo arrives with identical payload while the flush is still in flight.
    coord.onRemoteEvent('task', { eventType: 'INSERT', task: t2 });
    expect(mutators.state().tasks.length).toBe(1);   // echo dropped — task2 not re-added by remote

    resolveUpsert();
    await flush();
  });

  it('should_apply_foreign_event_when_fingerprint_differs', async () => {
    const t = { id: 'task1', title: 'A', startDate: '2026-01-05', duration: 1, color: 'blue', teamId: null, laneId: null, position: 0 };
    mutators.seed({ tasks: [t] });
    coord.noteLocalChange('task', [t]);

    // Foreign UPDATE — different title.
    coord.onRemoteEvent('task', { eventType: 'UPDATE', task: { ...t, title: 'FOREIGN' } });
    expect(mutators.state().tasks[0].title).toBe('FOREIGN');
    expect(suppressDetection).toHaveBeenCalled();
  });
});

describe('cloudSyncCoordinator — flush', () => {
  let coord, sbProject, mutators;

  beforeEach(() => {
    sbProject = makeStubProject();
    mutators = makeInMemoryMutators();
    coord = createCloudSyncCoordinator({
      sbProject,
      mutators,
      suppressDetection: vi.fn(),
    });
    coord.setProjectId('P1');
  });

  it('should_not_flush_on_first_seen_baseline', async () => {
    const t = { id: 'task1', title: 'A', startDate: '2026-01-05', duration: 1, color: 'blue', teamId: null, laneId: null, position: 0 };
    coord.noteLocalChange('task', [t]);
    await flush();
    expect(sbProject.upsertTask).not.toHaveBeenCalled();
  });

  it('should_flush_added_task_after_debounce', async () => {
    const t1 = { id: 'task1', title: 'A', startDate: '2026-01-05', duration: 1, color: 'blue', teamId: null, laneId: null, position: 0 };
    coord.noteLocalChange('task', [t1]);  // baseline
    coord.noteLocalChange('task', [t1, { ...t1, id: 'task2', title: 'B' }]);
    await flush();
    expect(sbProject.upsertTask).toHaveBeenCalled();
    const upsertedIds = sbProject.upsertTask.mock.calls.map(c => c[0].id);
    expect(upsertedIds).toContain('task2');
  });

  it('should_refuse_suspicious_bulk_team_delete', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const teams = [
      { id: 't1', name: 'A', color: 'blue', lanes: [] },
      { id: 't2', name: 'B', color: 'red', lanes: [] },
      { id: 't3', name: 'C', color: 'green', lanes: [] },
      { id: 't4', name: 'D', color: 'yellow', lanes: [] },
    ];
    coord.noteLocalChange('team', teams);          // baseline
    coord.noteLocalChange('team', [teams[0]]);     // remove 3 of 4 = suspicious
    await flush();
    expect(sbProject.removeTeam).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('suspicious bulk delete'), expect.any(Object));
    consoleWarn.mockRestore();
  });
});

describe('cloudSyncCoordinator — project switch', () => {
  it('should_clear_baselines_when_project_id_changes', async () => {
    const sbProject = makeStubProject();
    const mutators = makeInMemoryMutators();
    const coord = createCloudSyncCoordinator({
      sbProject,
      mutators,
      suppressDetection: vi.fn(),
    });
    coord.setProjectId('P1');
    const t = { id: 'task1', title: 'A', startDate: '2026-01-05', duration: 1, color: 'blue', teamId: null, laneId: null, position: 0 };
    coord.noteLocalChange('task', [t]);  // baseline for P1

    coord.setProjectId('P2');
    // New project — first noteLocalChange should be baseline, not flush.
    coord.noteLocalChange('task', [{ ...t, title: 'different' }]);
    await flush();
    expect(sbProject.upsertTask).not.toHaveBeenCalled();
  });
});

describe('cloudSyncCoordinator — resync', () => {
  it('should_replace_state_and_advance_baselines_on_resync', async () => {
    const sbProject = makeStubProject();
    const mutators = makeInMemoryMutators();
    const coord = createCloudSyncCoordinator({
      sbProject,
      mutators,
      suppressDetection: vi.fn(),
    });
    coord.setProjectId('P1');

    const fresh = {
      tasks: [{ id: 'fresh1', title: 'X', startDate: '2026-02-02', duration: 1, color: 'blue', teamId: null, laneId: null, position: 0 }],
      teams: [{ id: 'tA', name: 'Alpha', color: 'blue', lanes: [] }],
      title: 'NewTitle',
    };
    await coord.resync({ fetchAll: async () => fresh });

    expect(mutators.state().tasks).toEqual(fresh.tasks);
    expect(mutators.state().teams[0].id).toBe('tA');
    expect(mutators.state().title).toBe('NewTitle');

    // After resync, a noteLocalChange equal to the fresh state should NOT flush.
    coord.noteLocalChange('task', fresh.tasks);
    await flush();
    expect(sbProject.upsertTask).not.toHaveBeenCalled();
  });
});
