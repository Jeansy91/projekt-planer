import { describe, it, expect } from 'vitest';
import { projectDrag, reindexGanttPositions } from './dragProjection';

const iso = (d) => new Date(d).toISOString();

const mkTask = (id, overrides = {}) => ({
  id,
  title: id,
  startDate: iso('2026-01-05'), // Monday
  duration: 1,
  color: 'blue',
  teamId: null,
  laneId: null,
  notes: '',
  position: 0,
  ...overrides,
});

describe('projectDrag — move', () => {
  it('should_shift_startDate_by_deltaWeeks_when_moving_within_gantt', () => {
    const tasks = [mkTask('a', { teamId: 'T1' })];
    const op = {
      type: 'move',
      taskIds: ['a'],
      initialStates: [{ id: 'a', startDate: new Date('2026-01-05'), duration: 1 }],
      deltaWeeks: 2,
      sourceContainer: { kind: 'gantt', teamId: 'T1' },
      targetContainer: { kind: 'gantt', teamId: 'T1' },
      insertIndex: 0,
      teams: [{ id: 'T1', viewMode: 'gantt' }],
    };
    const next = projectDrag(tasks, op);
    expect(next[0].startDate).toBe(iso('2026-01-19'));
  });

  it('should_reassign_teamId_and_laneId_when_moving_across_containers', () => {
    const tasks = [mkTask('a', { teamId: 'T1' })];
    const op = {
      type: 'move',
      taskIds: ['a'],
      initialStates: [{ id: 'a', startDate: new Date('2026-01-05'), duration: 1 }],
      deltaWeeks: 0,
      sourceContainer: { kind: 'gantt', teamId: 'T1' },
      targetContainer: { kind: 'lane', laneId: 'L1' },
      teams: [{ id: 'T2', viewMode: 'swimlane', lanes: [{ id: 'L1' }] }],
    };
    const next = projectDrag(tasks, op);
    expect(next[0].teamId).toBe('T2');
    expect(next[0].laneId).toBe('L1');
  });

  it('should_push_overlapping_swimlane_tasks_right_on_drop_into_lane', () => {
    const tasks = [
      mkTask('moved', { teamId: 'T1', laneId: 'L1', startDate: iso('2026-01-12'), duration: 2 }),
      mkTask('blocker', { teamId: 'T1', laneId: 'L1', startDate: iso('2026-01-19'), duration: 1 }),
    ];
    const op = {
      type: 'move',
      taskIds: ['moved'],
      initialStates: [{ id: 'moved', startDate: new Date('2026-01-05'), duration: 2 }],
      deltaWeeks: 1, // shifts moved from 01-05 → 01-12, overlapping blocker at 01-19? blocker at 01-19 (week 2 after 01-05)
      sourceContainer: { kind: 'lane', laneId: 'L1' },
      targetContainer: { kind: 'lane', laneId: 'L1' },
      teams: [{ id: 'T1', viewMode: 'swimlane', lanes: [{ id: 'L1' }] }],
    };
    const next = projectDrag(tasks, op);
    const blocker = next.find(t => t.id === 'blocker');
    // moved ends week of 01-19; blocker should push to 01-26
    expect(new Date(blocker.startDate).getTime()).toBeGreaterThan(new Date(iso('2026-01-19')).getTime());
  });

  it('should_compact_source_staging_when_task_leaves', () => {
    const tasks = [
      mkTask('leaving', { teamId: 'T1', startDate: iso('2026-01-05'), duration: 1 }),
      mkTask('staying', { teamId: 'T1', startDate: iso('2026-01-12'), duration: 1 }),
    ];
    const op = {
      type: 'move',
      taskIds: ['leaving'],
      initialStates: [{ id: 'leaving', startDate: new Date('2026-01-05'), duration: 1 }],
      deltaWeeks: 0,
      sourceContainer: { kind: 'staging', teamId: 'T1' },
      targetContainer: { kind: 'lane', laneId: 'L1' },
      teams: [{ id: 'T1', viewMode: 'swimlane', lanes: [{ id: 'L1' }] }],
    };
    const next = projectDrag(tasks, op);
    const staying = next.find(t => t.id === 'staying');
    // staying should be packed at the anchor (its own old startDate of 01-12 was the only remaining)
    expect(staying.startDate).toBe(iso('2026-01-12'));
  });
});

describe('projectDrag — resize', () => {
  it('should_extend_duration_on_resize_right', () => {
    const tasks = [mkTask('a', { teamId: 'T1', laneId: 'L1', duration: 2 })];
    const op = {
      type: 'resize-right',
      taskIds: ['a'],
      initialStates: [{ id: 'a', startDate: new Date('2026-01-05'), duration: 2 }],
      deltaWeeks: 3,
      sourceContainer: { kind: 'lane', laneId: 'L1' },
      targetContainer: { kind: 'lane', laneId: 'L1' },
      teams: [{ id: 'T1', viewMode: 'swimlane', lanes: [{ id: 'L1' }] }],
    };
    const next = projectDrag(tasks, op);
    expect(next[0].duration).toBe(5);
  });

  it('should_clamp_resize_left_against_neighbor', () => {
    const tasks = [
      mkTask('left', { teamId: 'T1', laneId: 'L1', startDate: iso('2026-01-05'), duration: 1 }),
      mkTask('right', { teamId: 'T1', laneId: 'L1', startDate: iso('2026-01-19'), duration: 2 }),
    ];
    // Try to resize 'right' left by 3 weeks — would push it into 'left'. Should clamp.
    const op = {
      type: 'resize-left',
      taskIds: ['right'],
      initialStates: [{ id: 'right', startDate: new Date('2026-01-19'), duration: 2 }],
      deltaWeeks: -3,
      sourceContainer: { kind: 'lane', laneId: 'L1' },
      targetContainer: { kind: 'lane', laneId: 'L1' },
      teams: [{ id: 'T1', viewMode: 'swimlane', lanes: [{ id: 'L1' }] }],
    };
    const next = projectDrag(tasks, op);
    const right = next.find(t => t.id === 'right');
    // Should not start before 'left' ends (01-12 = week after 01-05).
    expect(new Date(right.startDate).getTime()).toBeGreaterThanOrEqual(new Date(iso('2026-01-12')).getTime());
  });
});

describe('reindexGanttPositions', () => {
  it('should_renumber_positions_within_target_team', () => {
    const tasks = [
      mkTask('a', { teamId: 'T1', position: 99 }),
      mkTask('b', { teamId: 'T1', position: 99 }),
      mkTask('c', { teamId: 'T2', position: 5 }),
    ];
    const next = reindexGanttPositions(tasks, 'T1');
    expect(next.find(t => t.id === 'a').position).toBe(0);
    expect(next.find(t => t.id === 'b').position).toBe(1);
    expect(next.find(t => t.id === 'c').position).toBe(5);
  });

  it('should_renumber_unassigned_group_when_targetTeamId_is_null', () => {
    const tasks = [
      mkTask('a', { teamId: null, position: 99 }),
      mkTask('b', { teamId: 'T1', position: 5 }),
    ];
    const next = reindexGanttPositions(tasks, null);
    expect(next.find(t => t.id === 'a').position).toBe(0);
    expect(next.find(t => t.id === 'b').position).toBe(5);
  });
});
