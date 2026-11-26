import { describe, it, expect, vi } from 'vitest';
import { detectChanges, stampEntries, reconstructStateAt } from './historyCore';

const task = (id, overrides = {}) => ({
  id, title: `T-${id}`, startDate: '2026-01-05', duration: 1,
  color: 'blue', teamId: null, laneId: null, notes: '', position: 0,
  ...overrides,
});
const team = (id, overrides = {}) => ({
  id, name: `Team ${id}`, color: 'green', icon: null,
  viewMode: 'gantt', collapsed: false, position: 0, lanes: [],
  ...overrides,
});
const snap = (tasks = [], teams = [], title = 'P') => ({ tasks, teams, title });

describe('detectChanges', () => {
  it('emits created/deleted/updated for tasks', () => {
    const prev = snap([task('a'), task('b')]);
    const next = snap([task('a', { title: 'A2' }), task('c')]);
    const entries = detectChanges(prev, next, { projectId: 'p' });
    expect(entries.find(e => e.action === 'created' && e.entityId === 'c')).toBeTruthy();
    expect(entries.find(e => e.action === 'deleted' && e.entityId === 'b')).toBeTruthy();
    expect(entries.find(e => e.action === 'updated' && e.entityId === 'a').changes.title)
      .toEqual({ from: 'T-a', to: 'A2' });
  });

  it('classifies date-only changes as moved/resized', () => {
    const prev = snap([task('a')]);
    const moved = detectChanges(prev, snap([task('a', { startDate: '2026-02-01' })]), { projectId: 'p' });
    const resized = detectChanges(prev, snap([task('a', { duration: 3 })]), { projectId: 'p' });
    expect(moved[0].action).toBe('moved');
    expect(resized[0].action).toBe('resized');
  });

  it('attaches _snapshot to deleted tasks for cross-session restore', () => {
    const prev = snap([task('a', { notes: 'keep me' })]);
    const [del] = detectChanges(prev, snap([]), { projectId: 'p' });
    expect(del.changes._snapshot.notes).toBe('keep me');
  });

  it('skips title diff when prev.title is null (uninitialised snapshot)', () => {
    const prev = { tasks: [], teams: [], title: null };
    const entries = detectChanges(prev, snap([], [], 'First'), { projectId: 'p' });
    expect(entries.find(e => e.entityType === 'project')).toBeUndefined();
  });

  it('emits a project entry when title changes', () => {
    const entries = detectChanges(snap([], [], 'Old'), snap([], [], 'New'), { projectId: 'p1' });
    expect(entries[0]).toMatchObject({
      action: 'updated', entityType: 'project', entityId: 'p1',
      changes: { title: { from: 'Old', to: 'New' } },
    });
  });

  it('does not track moves within a swimlane teams unassigned lane', () => {
    const sw = team('t1', { viewMode: 'swimlane' });
    const prev = snap([task('a', { teamId: 't1', laneId: null, startDate: '2026-01-05' })], [sw]);
    const next = snap([task('a', { teamId: 't1', laneId: null, startDate: '2026-02-01' })], [sw]);
    expect(detectChanges(prev, next, { projectId: 'p' })).toEqual([]);
  });
});

describe('stampEntries', () => {
  it('adds id, timestamp, and userId to each entry', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('uuid-1').mockReturnValueOnce('uuid-2');
    const stamped = stampEntries(
      [{ action: 'created', entityType: 'task', entityId: 'a', entityName: 'A' },
       { action: 'deleted', entityType: 'task', entityId: 'b', entityName: 'B' }],
      { userId: 'user-1', now: '2026-05-21T00:00:00.000Z' }
    );
    expect(stamped[0]).toMatchObject({ id: 'uuid-1', timestamp: '2026-05-21T00:00:00.000Z', userId: 'user-1', action: 'created' });
    expect(stamped[1].id).toBe('uuid-2');
  });
});

describe('reconstructStateAt', () => {
  it('reverse-applies more recent entries to recover state right after the target was committed', () => {
    const current = snap([task('a', { title: 'A renamed' }), task('c')], [], 'New title');
    const history = [
      // newest first
      { id: 'e3', action: 'updated', entityType: 'project', entityId: 'p', changes: { title: { from: 'Old title', to: 'New title' } } },
      { id: 'e2', action: 'created', entityType: 'task', entityId: 'c' },
      { id: 'e1', action: 'updated', entityType: 'task', entityId: 'a', changes: { title: { from: 'A', to: 'A renamed' } } },
    ];
    const restored = reconstructStateAt('e1', history, current);
    // After e1: task a was just renamed to "A renamed"; c not yet created; title still old.
    expect(restored.tasks.find(t => t.id === 'a').title).toBe('A renamed');
    expect(restored.tasks.find(t => t.id === 'c')).toBeUndefined();
    expect(restored.title).toBe('Old title');
  });

  it('returns null for unknown entryId', () => {
    expect(reconstructStateAt('ghost', [], snap())).toBeNull();
  });
});
