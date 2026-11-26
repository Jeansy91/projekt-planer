import { describe, it, expect } from 'vitest';
import { createPendingFlushRegistry } from './pendingFlushRegistry';

describe('pendingFlushRegistry', () => {
  describe('task kind', () => {
    it('should_return_false_when_isEcho_called_on_empty_registry', () => {
      const r = createPendingFlushRegistry();
      expect(r.isEcho('task', 'task-1', { id: 'task-1', title: 'x' })).toBe(false);
    });

    it('should_return_true_when_added_payload_arrives_as_echo', () => {
      const r = createPendingFlushRegistry();
      const payload = { id: 'task-1', title: 'x' };
      r.add('task', 'task-1', payload);
      expect(r.isEcho('task', 'task-1', { ...payload })).toBe(true);
    });

    it('should_return_false_when_id_matches_but_payload_differs', () => {
      const r = createPendingFlushRegistry();
      r.add('task', 'task-1', { id: 'task-1', title: 'mine' });
      expect(r.isEcho('task', 'task-1', { id: 'task-1', title: 'theirs' })).toBe(false);
    });

    it('should_return_false_after_clear', () => {
      const r = createPendingFlushRegistry();
      const payload = { id: 'task-1', title: 'x' };
      r.add('task', 'task-1', payload);
      r.clear('task', ['task-1']);
      expect(r.isEcho('task', 'task-1', payload)).toBe(false);
    });
  });

  describe('team kind canonical shaping', () => {
    it('should_ignore_lanes_and_collapsed_when_fingerprinting_team', () => {
      // Team fingerprint must cover only {id, name, color} — lanes and collapsed
      // are tracked separately and must not invalidate the echo.
      const r = createPendingFlushRegistry();
      r.add('team', 't1', { id: 't1', name: 'A', color: 'blue', lanes: [{ id: 'l1' }], collapsed: true });
      const echo = { id: 't1', name: 'A', color: 'blue', lanes: [], collapsed: false };
      expect(r.isEcho('team', 't1', echo)).toBe(true);
    });

    it('should_detect_team_color_change_as_foreign_edit', () => {
      const r = createPendingFlushRegistry();
      r.add('team', 't1', { id: 't1', name: 'A', color: 'blue' });
      expect(r.isEcho('team', 't1', { id: 't1', name: 'A', color: 'red' })).toBe(false);
    });
  });

  describe('title kind', () => {
    it('should_match_string_title_by_value', () => {
      const r = createPendingFlushRegistry();
      r.add('title', 'project-1', 'My Project');
      expect(r.isEcho('title', 'project-1', 'My Project')).toBe(true);
      expect(r.isEcho('title', 'project-1', 'Other')).toBe(false);
    });
  });

  describe('clearIfMatches', () => {
    it('should_clear_when_stored_fingerprint_matches', () => {
      const r = createPendingFlushRegistry();
      r.add('title', 'p', 'A');
      r.clearIfMatches('title', 'p', 'A');
      expect(r.isEcho('title', 'p', 'A')).toBe(false);
    });

    it('should_not_clear_when_a_newer_flush_replaced_the_entry', () => {
      // Two title flushes overlap: first ('A') settles after second ('B') started.
      // The settle of the first must NOT erase the pending entry for 'B'.
      const r = createPendingFlushRegistry();
      r.add('title', 'p', 'A');
      r.add('title', 'p', 'B');
      r.clearIfMatches('title', 'p', 'A');
      expect(r.isEcho('title', 'p', 'B')).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should_wipe_all_kinds', () => {
      const r = createPendingFlushRegistry();
      r.add('task', 't1', { id: 't1' });
      r.add('team', 'tm1', { id: 'tm1', name: 'A', color: 'red' });
      r.add('lane', 'l1', { id: 'l1' });
      r.add('title', 'p', 'A');
      r.clearAll();
      expect(r.isEcho('task', 't1', { id: 't1' })).toBe(false);
      expect(r.isEcho('team', 'tm1', { id: 'tm1', name: 'A', color: 'red' })).toBe(false);
      expect(r.isEcho('lane', 'l1', { id: 'l1' })).toBe(false);
      expect(r.isEcho('title', 'p', 'A')).toBe(false);
    });
  });
});
