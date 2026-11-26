import { describe, it, expect } from 'vitest';
import { getTeamTasks, isLaneSelectionAdjacent } from './taskFilters';

describe('getTeamTasks', () => {
  const tasks = [
    { id: 'a', teamId: 't1' },
    { id: 'b', teamId: 't2' },
    { id: 'c', teamId: null },
    { id: 'd' },
  ];
  it('filters by teamId', () => {
    expect(getTeamTasks(tasks, 't1').map(t => t.id)).toEqual(['a']);
  });
  it('returns unassigned (no teamId) when teamId is null', () => {
    expect(getTeamTasks(tasks, null).map(t => t.id)).toEqual(['c', 'd']);
  });
});

describe('isLaneSelectionAdjacent', () => {
  const laneTasks = [
    { id: '1', laneId: 'l1', startDate: '2026-01-05' },
    { id: '2', laneId: 'l1', startDate: '2026-01-12' },
    { id: '3', laneId: 'l1', startDate: '2026-01-19' },
    { id: '4', laneId: 'l1', startDate: '2026-01-26' },
    { id: 'x', laneId: null, startDate: '2026-01-05' },
  ];

  it('accepts a single selection', () => {
    expect(isLaneSelectionAdjacent(['2'], laneTasks[1], laneTasks)).toBe(true);
  });

  it('accepts adjacent lane Tasks', () => {
    expect(isLaneSelectionAdjacent(['1', '2', '3'], laneTasks[2], laneTasks)).toBe(true);
  });

  it('rejects a gap-inducing toggle (1 + 3 in same lane)', () => {
    expect(isLaneSelectionAdjacent(['1', '3'], laneTasks[2], laneTasks)).toBe(false);
  });

  it('ignores Tasks outside the clicked Tasks lane', () => {
    expect(isLaneSelectionAdjacent(['x', '2'], laneTasks[1], laneTasks)).toBe(true);
  });

  it('returns true when the clicked Task has no laneId (Gantt mode)', () => {
    expect(isLaneSelectionAdjacent(['1', '3'], { id: 'g', laneId: null }, laneTasks)).toBe(true);
  });
});
