import { describe, it, expect } from 'vitest';
import {
  fingerprint,
  diffTasks,
  diffTeamsAndLanes,
  isSuspiciousBulkDelete,
} from './cloudSyncCore';

describe('fingerprint', () => {
  it('should_return_same_string_when_keys_in_different_order', () => {
    const a = { id: '1', title: 'x', date: '2026-01-01' };
    const b = { date: '2026-01-01', id: '1', title: 'x' };
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it('should_differ_when_any_field_differs', () => {
    expect(fingerprint({ id: '1', title: 'a' })).not.toBe(fingerprint({ id: '1', title: 'b' }));
  });

  it('should_handle_nested_objects_with_stable_order', () => {
    const a = { id: '1', meta: { z: 1, a: 2 } };
    const b = { id: '1', meta: { a: 2, z: 1 } };
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it('should_distinguish_null_from_missing', () => {
    expect(fingerprint({ id: '1', date: null })).not.toBe(fingerprint({ id: '1' }));
  });

  it('should_preserve_array_order', () => {
    expect(fingerprint([1, 2, 3])).not.toBe(fingerprint([3, 2, 1]));
  });
});

describe('diffTasks', () => {
  it('should_detect_added_when_id_only_in_current', () => {
    const synced = [{ id: '1', title: 'a' }];
    const current = [{ id: '1', title: 'a' }, { id: '2', title: 'b' }];
    expect(diffTasks(synced, current).added).toEqual([{ id: '2', title: 'b' }]);
  });

  it('should_detect_removed_when_id_only_in_synced', () => {
    const synced = [{ id: '1' }, { id: '2' }];
    const current = [{ id: '1' }];
    expect(diffTasks(synced, current).removed).toEqual([{ id: '2' }]);
  });

  it('should_detect_updated_when_fields_change', () => {
    const synced = [{ id: '1', title: 'a' }];
    const current = [{ id: '1', title: 'b' }];
    expect(diffTasks(synced, current).updated).toEqual([{ id: '1', title: 'b' }]);
  });

  it('should_return_empty_diff_when_payloads_equivalent_but_keys_reordered', () => {
    const synced = [{ id: '1', title: 'a', notes: 'n' }];
    const current = [{ notes: 'n', id: '1', title: 'a' }];
    const d = diffTasks(synced, current);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
    expect(d.updated).toEqual([]);
  });
});

describe('diffTeamsAndLanes', () => {
  it('should_detect_added_team', () => {
    const prev = [{ id: 't1', name: 'A', lanes: [] }];
    const curr = [{ id: 't1', name: 'A', lanes: [] }, { id: 't2', name: 'B', lanes: [] }];
    const d = diffTeamsAndLanes(prev, curr);
    expect(d.addedTeams.map(t => t.id)).toEqual(['t2']);
  });

  it('should_detect_reordered_when_same_ids_different_order', () => {
    const prev = [{ id: 't1', lanes: [] }, { id: 't2', lanes: [] }];
    const curr = [{ id: 't2', lanes: [] }, { id: 't1', lanes: [] }];
    expect(diffTeamsAndLanes(prev, curr).reordered).toBe(true);
  });

  it('should_not_flag_team_update_when_only_lanes_or_collapsed_changed', () => {
    const prev = [{ id: 't1', name: 'A', lanes: [{ id: 'l1', name: 'X', position: 0 }], collapsed: false }];
    const curr = [{ id: 't1', name: 'A', lanes: [{ id: 'l1', name: 'Y', position: 0 }], collapsed: true }];
    expect(diffTeamsAndLanes(prev, curr).updatedTeams).toEqual([]);
  });

  it('should_detect_added_lane_within_team', () => {
    const prev = [{ id: 't1', lanes: [{ id: 'l1', name: 'X', position: 0 }] }];
    const curr = [{ id: 't1', lanes: [{ id: 'l1', name: 'X', position: 0 }, { id: 'l2', name: 'Y', position: 1 }] }];
    const d = diffTeamsAndLanes(prev, curr);
    expect(d.addedLanes.map(l => l.id)).toEqual(['l2']);
  });

  it('should_detect_lane_moved_to_different_team', () => {
    const prev = [
      { id: 't1', lanes: [{ id: 'l1', name: 'X', position: 0 }] },
      { id: 't2', lanes: [] },
    ];
    const curr = [
      { id: 't1', lanes: [] },
      { id: 't2', lanes: [{ id: 'l1', name: 'X', position: 0 }] },
    ];
    const d = diffTeamsAndLanes(prev, curr);
    expect(d.updatedLanes.map(l => ({ id: l.id, teamId: l.teamId }))).toEqual([{ id: 'l1', teamId: 't2' }]);
  });
});

describe('isSuspiciousBulkDelete', () => {
  const mkTeams = (n) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, lanes: [] }));

  it('should_return_true_when_half_or_more_teams_removed_with_no_adds', () => {
    const diff = { removedTeams: [{}, {}, {}], addedTeams: [], removedLanes: [], addedLanes: [] };
    expect(isSuspiciousBulkDelete(diff, mkTeams(6))).toBe(true);
  });

  it('should_return_false_when_below_minimum_absolute_count', () => {
    const diff = { removedTeams: [{}, {}], addedTeams: [], removedLanes: [], addedLanes: [] };
    expect(isSuspiciousBulkDelete(diff, mkTeams(4))).toBe(false);
  });

  it('should_return_false_when_adds_compensate', () => {
    const diff = { removedTeams: [{}, {}, {}], addedTeams: [{}], removedLanes: [], addedLanes: [] };
    expect(isSuspiciousBulkDelete(diff, mkTeams(6))).toBe(false);
  });

  it('should_return_true_when_half_or_more_lanes_wiped', () => {
    const prev = [{ id: 't1', lanes: [{}, {}, {}, {}, {}, {}] }]; // 6 lanes
    const diff = { removedTeams: [], addedTeams: [], removedLanes: [{}, {}, {}], addedLanes: [] };
    expect(isSuspiciousBulkDelete(diff, prev)).toBe(true);
  });

  it('should_return_false_for_empty_diff', () => {
    const diff = { removedTeams: [], addedTeams: [], removedLanes: [], addedLanes: [] };
    expect(isSuspiciousBulkDelete(diff, mkTeams(10))).toBe(false);
  });
});
