import { fingerprint } from './cloudSyncCore';

// Pending flush registry — owns the Echo filter's memory across all kinds
// (Task, Team, Lane, Title). One unified store keyed by (kind, id), with
// per-kind canonical shaping baked in so callers stop duplicating the rule
// "Teams fingerprint over {id, name, color}, not the full row".
//
// See docs/glossary.md → "Pending flush", "Fingerprint", "Echo".

const shapers = {
  task: (t) => t,
  team: (t) => ({ id: t.id, name: t.name, color: t.color }),
  lane: (l) => l,
  title: (s) => s,
};

const fp = (kind, payload) => fingerprint(shapers[kind](payload));

export const createPendingFlushRegistry = () => {
  const maps = {
    task: new Map(),
    team: new Map(),
    lane: new Map(),
    title: new Map(),
  };

  return {
    add(kind, id, payload) {
      maps[kind].set(id, fp(kind, payload));
    },
    isEcho(kind, id, incomingPayload) {
      const stored = maps[kind].get(id);
      if (stored === undefined) return false;
      return stored === fp(kind, incomingPayload);
    },
    clear(kind, ids) {
      const map = maps[kind];
      ids.forEach(id => map.delete(id));
    },
    // Conditional clear — only removes the entry if the stored fingerprint
    // still matches `payload`. Used by paths where two flushes for the same
    // id can overlap (e.g. Title, which has no debounce gate) so we don't
    // clobber a newer pending flush with an older flush's settle.
    clearIfMatches(kind, id, payload) {
      const stored = maps[kind].get(id);
      if (stored !== undefined && stored === fp(kind, payload)) {
        maps[kind].delete(id);
      }
    },
    clearAll() {
      Object.values(maps).forEach(m => m.clear());
    },
  };
};
