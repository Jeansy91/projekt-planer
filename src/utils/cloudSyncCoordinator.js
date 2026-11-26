import { createPendingFlushRegistry } from './pendingFlushRegistry';
import { diffTasks, diffTeamsAndLanes, isSuspiciousBulkDelete } from './cloudSyncCore';

// Cloud sync coordinator — pure JS implementation of Cloud sync.
//
// Owns per-kind baselines, the Pending flush registry, debounce timers,
// in-flight promise gates, and cross-kind flush ordering (Teams flush before
// Tasks so foreign keys resolve). The useCloudSync hook is a thin React
// binding around it. See docs/glossary.md → "Cloud sync coordinator".
//
// Construction:
//   createCloudSyncCoordinator({ sbProject, mutators, suppressDetection })
//
// `mutators` are React-setter-shaped functional updaters supplied by the hook:
//   { applyTasks(fn), applyTeams(fn), applyTitle(value) }
//
// Lane is its own registry kind (for Echo filtering) but lane events are
// routed through the Team policy, since Lanes are children of Teams.

const TASK_DEBOUNCE = 150;
const TASK_MAX_WAIT = 1500;
const TITLE_DEBOUNCE = 500;

const withRetry = async (fn) => {
  try { await fn(); return true; }
  catch (err) {
    console.warn('[CloudSync] Op failed, retrying:', err.message);
    try { await fn(); return true; }
    catch (retryErr) {
      console.error('[CloudSync] Retry failed:', retryErr.message);
      return false;
    }
  }
};

export const createCloudSyncCoordinator = ({ sbProject, mutators, suppressDetection }) => {
  const registry = createPendingFlushRegistry();

  // Baselines — last DB-confirmed state per kind. null = not yet initialized.
  const baselines = { task: null, team: null, title: null };

  // Cross-kind flush coordination.
  const inFlight = { task: null, team: null };
  const timers = { taskDebounce: null, taskMaxWait: null, titleDebounce: null };

  let projectId = null;
  let resyncing = false;

  const setProjectId = (id) => {
    if (id === projectId) return;
    projectId = id;
    baselines.task = null;
    baselines.team = null;
    baselines.title = null;
    registry.clearAll();
  };

  // ─── Flush (local → DB) ─────────────────────────────────────────────

  const flushTaskOps = async (diff) => {
    const ops = [
      ...[...diff.added, ...diff.updated].map(t => withRetry(() => sbProject.upsertTask(t, projectId))),
      ...diff.removed.map(t => withRetry(() => sbProject.removeTask(t.id))),
    ];
    if (ops.length === 0) return true;
    const results = await Promise.all(ops);
    return results.every(Boolean);
  };

  const flushTeamOps = async (diff, currentTeams) => {
    const ops = [];

    diff.addedTeams.forEach(t =>
      ops.push(withRetry(() => sbProject.upsertTeam(t, projectId, currentTeams.indexOf(t)))));
    diff.removedTeams.forEach(t =>
      ops.push(withRetry(() => sbProject.removeTeam(t.id))));

    if (diff.reordered) {
      currentTeams.forEach((t, i) =>
        ops.push(withRetry(() => sbProject.upsertTeam(t, projectId, i))));
    } else {
      diff.updatedTeams.forEach(t =>
        ops.push(withRetry(() => sbProject.upsertTeam(t, projectId, currentTeams.indexOf(t)))));
    }

    diff.addedLanes.forEach(l =>
      ops.push(withRetry(() => sbProject.upsertLane(l, l.teamId, l.position))));
    diff.removedLanes.forEach(l =>
      ops.push(withRetry(() => sbProject.removeLane(l.id))));
    diff.updatedLanes.forEach(l =>
      ops.push(withRetry(() => sbProject.upsertLane(l, l.teamId, l.position))));

    if (ops.length === 0) return true;
    const results = await Promise.all(ops);
    return results.every(Boolean);
  };

  // Latest known local state per kind — captured at noteLocalChange time so
  // the debounced/awaited flush sees the freshest values without React refs.
  const latest = { task: null, team: null, title: null };

  const doFlushTasks = async () => {
    // Cross-kind ordering: Teams flush before Tasks so FKs resolve. Also wait
    // for any prior in-flight task flush.
    if (inFlight.team) await inFlight.team;
    if (inFlight.task) await inFlight.task;

    const run = async () => {
      const current = latest.task;
      const synced = baselines.task;
      if (!synced || !current || synced === current) return;

      const diff = diffTasks(synced, current);
      if (!diff.added.length && !diff.removed.length && !diff.updated.length) {
        baselines.task = current;
        return;
      }

      [...diff.added, ...diff.updated].forEach(t => registry.add('task', t.id, t));
      const ok = await flushTaskOps(diff);
      registry.clear('task', [...diff.added, ...diff.updated, ...diff.removed].map(t => t.id));
      if (ok) baselines.task = current;
    };

    inFlight.task = run();
    try { await inFlight.task; }
    finally { inFlight.task = null; }
  };

  const scheduleTaskFlush = () => {
    if (timers.taskDebounce) clearTimeout(timers.taskDebounce);
    timers.taskDebounce = setTimeout(async () => {
      if (timers.taskMaxWait) { clearTimeout(timers.taskMaxWait); timers.taskMaxWait = null; }
      timers.taskDebounce = null;
      await doFlushTasks();
    }, TASK_DEBOUNCE);

    if (!timers.taskMaxWait) {
      timers.taskMaxWait = setTimeout(async () => {
        timers.taskMaxWait = null;
        if (timers.taskDebounce) { clearTimeout(timers.taskDebounce); timers.taskDebounce = null; }
        await doFlushTasks();
      }, TASK_MAX_WAIT);
    }
  };

  const flushTeamsImmediate = async (nextTeams) => {
    const prev = baselines.team;
    if (!prev) return;
    const diff = diffTeamsAndLanes(prev, nextTeams);

    if (isSuspiciousBulkDelete(diff, prev)) {
      console.warn('[CloudSync] Refusing suspicious bulk delete:',
        { removedTeams: diff.removedTeams.length, removedLanes: diff.removedLanes.length });
      return;
    }

    [...diff.updatedTeams, ...diff.addedTeams].forEach(t => registry.add('team', t.id, t));
    [...diff.addedLanes, ...diff.updatedLanes].forEach(l => registry.add('lane', l.id, l));

    inFlight.team = flushTeamOps(diff, nextTeams)
      .then((ok) => {
        registry.clear('team', [...diff.addedTeams, ...diff.updatedTeams, ...diff.removedTeams].map(t => t.id));
        registry.clear('lane', [...diff.addedLanes, ...diff.updatedLanes, ...diff.removedLanes].map(l => l.id));
        if (ok) baselines.team = nextTeams;
      })
      .finally(() => { inFlight.team = null; });
  };

  const scheduleTitleFlush = () => {
    if (timers.titleDebounce) clearTimeout(timers.titleDebounce);
    timers.titleDebounce = setTimeout(async () => {
      timers.titleDebounce = null;
      const title = latest.title;
      const pid = projectId;
      const ok = await withRetry(() => sbProject.updateProjectSettings(pid, { title }));
      if (ok) baselines.title = title;
      registry.clearIfMatches('title', pid, title);
    }, TITLE_DEBOUNCE);
  };

  // ─── noteLocalChange — diff watcher entry point ─────────────────────

  const noteLocalChange = (kind, current) => {
    latest[kind] = current;

    if (baselines[kind] === null) {
      // First seen — initialize baseline without flushing.
      baselines[kind] = current;
      return;
    }

    if (kind === 'task') {
      scheduleTaskFlush();
    } else if (kind === 'team') {
      flushTeamsImmediate(current);
    } else if (kind === 'title') {
      registry.add('title', projectId, current);
      scheduleTitleFlush();
    }
  };

  // ─── Receive (DB → local) ───────────────────────────────────────────

  // Task policy.
  const applyTaskEvent = ({ eventType, task, oldId }) => {
    if (eventType === 'DELETE') {
      const id = oldId;
      suppressDetection?.();
      mutators.applyTasks(prev => {
        if (baselines.task) {
          baselines.task = baselines.task.filter(t => t.id !== id);
        }
        return prev.filter(t => t.id !== id);
      });
      return;
    }

    if (!task) return;
    if (registry.isEcho('task', task.id, task)) return;

    suppressDetection?.();
    mutators.applyTasks(prev => {
      const existing = prev.find(t => t.id === task.id);
      let next;
      if (eventType === 'INSERT') {
        next = existing ? prev : [...prev, task];
      } else {
        next = existing ? prev.map(t => t.id === task.id ? { ...t, ...task } : t) : prev;
      }
      if (baselines.task) {
        const baseline = baselines.task;
        const had = baseline.find(t => t.id === task.id);
        if (eventType === 'INSERT' && !had) baselines.task = [...baseline, task];
        else if (eventType === 'UPDATE' && had) baselines.task = baseline.map(t => t.id === task.id ? { ...t, ...task } : t);
      }
      return next;
    });
  };

  // Team policy — handles Team events AND Lane events (Lanes are children).
  const applyTeamEvent = ({ eventType, team, oldId }) => {
    if (eventType === 'DELETE') {
      const id = oldId;
      suppressDetection?.();
      mutators.applyTeams(prev => {
        if (baselines.team) {
          baselines.team = baselines.team.filter(t => t.id !== id);
        }
        return prev.filter(t => t.id !== id);
      });
      return;
    }

    if (!team) return;
    if (registry.isEcho('team', team.id, team)) return;

    suppressDetection?.();
    mutators.applyTeams(prev => {
      let next;
      const existing = prev.find(t => t.id === team.id);
      if (eventType === 'INSERT') {
        if (existing) {
          next = prev;
        } else {
          const newTeam = { ...team, lanes: [] };
          next = [...prev, newTeam];
          next.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        }
      } else {
        if (!existing) {
          next = prev;
        } else {
          const merged = { ...existing, ...team, lanes: existing.lanes, collapsed: existing.collapsed };
          next = prev.map(t => t.id === team.id ? merged : t);
          next.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        }
      }
      if (baselines.team) {
        const baseline = baselines.team;
        const hadInBaseline = baseline.find(t => t.id === team.id);
        if (eventType === 'INSERT' && !hadInBaseline) {
          baselines.team = [...baseline, { ...team, lanes: [] }]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        } else if (eventType === 'UPDATE' && hadInBaseline) {
          baselines.team = baseline
            .map(t => t.id === team.id ? { ...t, ...team, lanes: t.lanes } : t)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        }
      }
      return next;
    });
  };

  const applyLaneEvent = ({ eventType, lane, oldId }) => {
    if (eventType === 'DELETE') {
      const id = oldId;
      suppressDetection?.();
      mutators.applyTeams(prev => {
        if (baselines.team) {
          baselines.team = baselines.team.map(t => ({
            ...t,
            lanes: (t.lanes || []).filter(l => l.id !== id),
          }));
        }
        return prev.map(t => ({ ...t, lanes: (t.lanes || []).filter(l => l.id !== id) }));
      });
      return;
    }

    if (!lane) return;
    if (registry.isEcho('lane', lane.id, lane)) return;

    const laneData = { id: lane.id, name: lane.name, position: lane.position };

    suppressDetection?.();
    mutators.applyTeams(prev => {
      const currentOwner = prev.find(t => (t.lanes || []).some(l => l.id === lane.id));
      const movedTeam = currentOwner && lane.teamId !== currentOwner.id;

      let next;
      if (eventType === 'INSERT' || !currentOwner) {
        next = prev.map(t => {
          if (t.id !== lane.teamId) return t;
          if ((t.lanes || []).some(l => l.id === lane.id)) return t;
          const lanes = [...(t.lanes || []), laneData].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          return { ...t, lanes };
        });
      } else if (movedTeam) {
        next = prev.map(t => {
          if (t.id === currentOwner.id) return { ...t, lanes: (t.lanes || []).filter(l => l.id !== lane.id) };
          if (t.id === lane.teamId) {
            const lanes = [...(t.lanes || []).filter(l => l.id !== lane.id), laneData]
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            return { ...t, lanes };
          }
          return t;
        });
      } else {
        let changed = false;
        next = prev.map(t => {
          if (t.id !== lane.teamId) return t;
          const existing = (t.lanes || []).find(l => l.id === lane.id);
          if (!existing) return t;
          if (existing.name === lane.name && existing.position === lane.position) return t;
          changed = true;
          const lanes = (t.lanes || []).map(l => l.id === lane.id ? laneData : l)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          return { ...t, lanes };
        });
        if (!changed) next = prev;
      }

      if (baselines.team) {
        baselines.team = next.map(t => ({ ...t, lanes: [...(t.lanes || [])] }));
      }
      return next;
    });
  };

  const applyProjectEvent = ({ project }) => {
    if (!project?.title) return;
    if (registry.isEcho('title', projectId, project.title)) return;
    if (baselines.title === project.title) return;
    baselines.title = project.title;
    mutators.applyTitle(project.title);
  };

  const onRemoteEvent = (kind, event) => {
    if (kind === 'task') applyTaskEvent(event);
    else if (kind === 'team') applyTeamEvent(event);
    else if (kind === 'lane') applyLaneEvent(event);
    else if (kind === 'project') applyProjectEvent(event);
  };

  // ─── Resync ─────────────────────────────────────────────────────────

  // `loaders` is supplied by the caller because the coordinator should not
  // import Supabase directly. Shape:
  //   { fetchAll(projectId) → { tasks, teams, lanes, title } | null }
  const resync = async (loaders) => {
    if (!projectId || resyncing) return;
    resyncing = true;
    try {
      const data = await loaders.fetchAll(projectId);
      if (!data) return;
      const { tasks: nextTasks, teams: nextTeams, title: nextTitle } = data;

      suppressDetection?.();

      if (nextTasks) {
        baselines.task = nextTasks;
        latest.task = nextTasks;
        mutators.applyTasks(() => nextTasks);
      }

      if (nextTeams) {
        baselines.team = nextTeams;
        latest.team = nextTeams;
        // Preserve local per-user collapsed state.
        mutators.applyTeams(prev => nextTeams.map(t => {
          const existing = prev.find(p => p.id === t.id);
          return existing ? { ...t, collapsed: existing.collapsed } : t;
        }));
      }

      if (nextTitle) {
        baselines.title = nextTitle;
        latest.title = nextTitle;
        mutators.applyTitle(nextTitle);
      }
    } catch (err) {
      console.warn('[CloudSync] Resync failed:', err.message);
    } finally {
      resyncing = false;
    }
  };

  // ─── Lifecycle ──────────────────────────────────────────────────────

  const reset = () => {
    setProjectId(null);
    latest.task = null;
    latest.team = null;
    latest.title = null;
  };

  const dispose = () => {
    if (timers.taskDebounce) clearTimeout(timers.taskDebounce);
    if (timers.taskMaxWait) clearTimeout(timers.taskMaxWait);
    if (timers.titleDebounce) clearTimeout(timers.titleDebounce);
    timers.taskDebounce = null;
    timers.taskMaxWait = null;
    timers.titleDebounce = null;
  };

  return {
    setProjectId,
    noteLocalChange,
    onRemoteEvent,
    resync,
    reset,
    dispose,
  };
};
