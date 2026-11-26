import { compactStagingRow, getStagingTasks } from './staging';

// Week-index math + lane collision/clamp helpers are projection internals — kept
// private here so the only public surface is `projectDrag` (and the commit-only
// `reindexGanttPositions`). See docs/glossary.md → "Drag projection".

const EPOCH = Date.UTC(2020, 0, 6); // Monday of ISO week 1, 2020
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const toWeekIndex = (task) => {
  const d = new Date(task.startDate);
  const ms = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH;
  const start = Math.round(ms / MS_PER_WEEK);
  return { start, end: start + task.duration - 1 };
};

const weekIndexToDate = (weekIdx) => new Date(EPOCH + weekIdx * MS_PER_WEEK).toISOString();

// Move collision: overlapping tasks are always pushed RIGHT.
const resolvePushOnMove = (laneTasks, movedTaskId) => {
  const movedTask = laneTasks.find(t => t.id === movedTaskId);
  if (!movedTask) return [];

  const movedIdx = toWeekIndex(movedTask);
  const others = laneTasks
    .filter(t => t.id !== movedTaskId)
    .map(t => ({ task: t, idx: toWeekIndex(t) }))
    .sort((a, b) => a.idx.start - b.idx.start);

  const overlapping = others.filter(o => o.idx.start <= movedIdx.end && o.idx.end >= movedIdx.start);
  if (overlapping.length === 0) return [];

  const nonOverlapping = others.filter(o => !(o.idx.start <= movedIdx.end && o.idx.end >= movedIdx.start));

  const updates = [];
  let rightCursor = movedIdx.end + 1;

  for (const { task, idx } of overlapping) {
    if (rightCursor !== idx.start) {
      updates.push({ id: task.id, startDate: weekIndexToDate(rightCursor) });
    }
    rightCursor = rightCursor + task.duration;
  }

  const afterTasks = nonOverlapping
    .filter(o => o.idx.start > movedIdx.end)
    .sort((a, b) => a.idx.start - b.idx.start);

  for (const { task, idx } of afterTasks) {
    if (idx.start < rightCursor) {
      updates.push({ id: task.id, startDate: weekIndexToDate(rightCursor) });
      rightCursor = rightCursor + task.duration;
    } else {
      break;
    }
  }

  return updates;
};

// Resize-right collision: push following tasks to the right; cascading.
const resolvePushOnResize = (laneTasks, resizedTaskId) => {
  const resizedTask = laneTasks.find(t => t.id === resizedTaskId);
  if (!resizedTask) return [];

  const resizedIdx = toWeekIndex(resizedTask);
  const sorted = laneTasks
    .filter(t => t.id !== resizedTaskId && toWeekIndex(t).start >= resizedIdx.start)
    .sort((a, b) => toWeekIndex(a).start - toWeekIndex(b).start);

  const updates = [];
  let currentEnd = resizedIdx.end + 1;

  for (const task of sorted) {
    const idx = toWeekIndex(task);
    if (idx.start < currentEnd) {
      updates.push({ id: task.id, startDate: weekIndexToDate(currentEnd) });
      currentEnd = currentEnd + task.duration;
    } else {
      currentEnd = idx.end + 1;
    }
  }

  return updates;
};

// Resize-left: clamp so it cannot extend past the previous task.
const clampResizeLeft = (laneTasks, resizedTaskId, newStartDate, newDuration) => {
  const resizedTask = laneTasks.find(t => t.id === resizedTaskId);
  if (!resizedTask) return null;

  const others = laneTasks.filter(t => t.id !== resizedTaskId);
  const newStartIdx = (() => {
    const d = new Date(newStartDate);
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / MS_PER_WEEK);
  })();

  let maxBlockEnd = -Infinity;
  for (const other of others) {
    const idx = toWeekIndex(other);
    if (idx.end < toWeekIndex(resizedTask).start || idx.end < newStartIdx + newDuration) {
      if (idx.end + 1 > maxBlockEnd && idx.end + 1 > newStartIdx) {
        maxBlockEnd = idx.end + 1;
      }
    }
  }

  if (maxBlockEnd > newStartIdx) {
    const clampedStart = maxBlockEnd;
    const originalEnd = toWeekIndex(resizedTask).end;
    const clampedDuration = originalEnd - clampedStart + 1;
    if (clampedDuration < 1) return null;
    return { clampedStartDate: weekIndexToDate(clampedStart), clampedDuration };
  }

  return null;
};

// Block-move collision: multiple adjacent tasks move as one entity.
const resolvePushBlock = (laneTasks, movedTaskIds) => {
  const movedSet = movedTaskIds instanceof Set ? movedTaskIds : new Set(movedTaskIds);
  const moved = laneTasks.filter(t => movedSet.has(t.id));
  const others = laneTasks
    .filter(t => !movedSet.has(t.id))
    .sort((a, b) => toWeekIndex(a).start - toWeekIndex(b).start);

  if (others.length === 0 || moved.length === 0) return [];

  const blockStart = Math.min(...moved.map(t => toWeekIndex(t).start));
  const blockEnd = Math.max(...moved.map(t => toWeekIndex(t).start + t.duration - 1));

  const updates = [];
  let currentEnd = blockEnd + 1;

  for (const task of others) {
    const idx = toWeekIndex(task);
    const overlapsBlock = idx.start <= blockEnd && idx.end >= blockStart;
    if (overlapsBlock || (idx.start >= blockStart && idx.start < currentEnd)) {
      updates.push({ id: task.id, startDate: weekIndexToDate(currentEnd) });
      currentEnd = currentEnd + task.duration;
    } else if (idx.start >= currentEnd) {
      currentEnd = idx.start + task.duration;
    }
  }

  return updates;
};

// Drag projection — the pure function that turns a drag operation into the
// complete next Task state. Both the live drag preview (mousemove) and the
// commit at drop (mouseup) call this with the same dragOp so the user sees
// exactly what gets saved. See docs/glossary.md → "Drag projection".
//
// Owns:
//   - geometric delta application (shift startDate by deltaWeeks; resize)
//   - team/lane reassignment for moved tasks
//   - target-container collision resolution (gantt insert, swimlane push,
//     staging compaction)
//   - source-container fallout (staging compaction when items leave)
//
// Does NOT own:
//   - Gantt `position` re-indexing — that is a commit-only normalization layered
//     on top by the caller, because positions only matter on save, not preview.
//
// dragOp shape:
//   {
//     type: 'move' | 'resize-left' | 'resize-right',
//     taskIds: string[],
//     initialStates: [{ id, startDate: Date, duration: number }],
//     deltaWeeks: number,
//     sourceContainer: { kind: 'gantt'|'lane'|'staging', teamId?, laneId? },
//     targetContainer: same shape (= source for resizes),
//     insertIndex?: number,         // for gantt drop ordering
//     stagingInsertIndex?: number,  // for staging drop ordering
//     teams: Team[],                // resolve lane → owning team
//   }

const sameContainer = (a, b) => {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'gantt') return (a.teamId ?? null) === (b.teamId ?? null);
  if (a.kind === 'lane') return a.laneId === b.laneId;
  return a.teamId === b.teamId;
};

const resolveTargetTeamAndLane = (targetContainer, teams) => {
  if (targetContainer.kind === 'gantt') return { teamId: targetContainer.teamId, laneId: null };
  if (targetContainer.kind === 'staging') return { teamId: targetContainer.teamId, laneId: null };
  // lane — find owning team
  const owner = (teams || []).find(t => (t.lanes || []).some(l => l.id === targetContainer.laneId));
  return { teamId: owner?.id ?? null, laneId: targetContainer.laneId };
};

const shiftDate = (startDate, deltaWeeks) => {
  const d = new Date(startDate);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return d.toISOString();
};

// Build the moved/resized version of each affected Task (new dates, duration,
// team/lane). Returns Map<id, taskWithNewFields>.
const computeMovedTasks = (allTasks, op) => {
  const movedMap = new Map();
  const { teamId: targetTeamId, laneId: targetLaneId } =
    op.type === 'move' ? resolveTargetTeamAndLane(op.targetContainer, op.teams) : { teamId: null, laneId: null };

  const isStagingSource = op.sourceContainer.kind === 'staging';
  const isStagingTarget = op.targetContainer?.kind === 'staging';
  const blockHorizontal = op.type === 'move' && isStagingSource && isStagingTarget && sameContainer(op.sourceContainer, op.targetContainer);

  for (const init of op.initialStates) {
    const orig = allTasks.find(t => t.id === init.id);
    if (!orig) continue;

    if (op.type === 'move') {
      const startDate = blockHorizontal
        ? new Date(init.startDate).toISOString()
        : shiftDate(init.startDate, op.deltaWeeks);
      movedMap.set(init.id, { ...orig, startDate, teamId: targetTeamId, laneId: targetLaneId });
    } else if (op.type === 'resize-right') {
      movedMap.set(init.id, { ...orig, duration: Math.max(1, init.duration + op.deltaWeeks) });
    } else if (op.type === 'resize-left') {
      const startDate = shiftDate(init.startDate, op.deltaWeeks);
      const duration = Math.max(1, init.duration - op.deltaWeeks);
      movedMap.set(init.id, { ...orig, startDate, duration });
    }
  }

  return movedMap;
};

// Apply resize-specific collision/clamp to a single source container.
const applyResizeCollisions = (tasks, op) => {
  const draggedId = op.taskIds[0];
  if (op.sourceContainer.kind === 'gantt') return tasks;

  if (op.sourceContainer.kind === 'staging') {
    const stagingIds = new Set(getStagingTasks(tasks, op.sourceContainer.teamId).map(t => t.id));
    const staging = tasks.filter(t => stagingIds.has(t.id))
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    if (staging.length === 0) return tasks;
    const anchor = staging[0].startDate;
    const compacted = compactStagingRow(staging, anchor);
    const updateMap = new Map(compacted.map(c => [c.id, c.startDate]));
    return tasks.map(t => updateMap.has(t.id) ? { ...t, startDate: updateMap.get(t.id) } : t);
  }

  // lane
  const laneTasks = tasks.filter(t => t.laneId === op.sourceContainer.laneId);

  if (op.type === 'resize-right') {
    const updates = resolvePushOnResize(laneTasks, draggedId);
    if (updates.length === 0) return tasks;
    const updateMap = new Map(updates.map(u => [u.id, u.startDate]));
    return tasks.map(t => updateMap.has(t.id) ? { ...t, startDate: updateMap.get(t.id) } : t);
  }

  if (op.type === 'resize-left') {
    const resized = laneTasks.find(t => t.id === draggedId);
    if (!resized) return tasks;
    const clamped = clampResizeLeft(laneTasks, draggedId, resized.startDate, resized.duration);
    if (!clamped) return tasks;
    return tasks.map(t =>
      t.id === draggedId
        ? { ...t, startDate: clamped.clampedStartDate, duration: clamped.clampedDuration }
        : t
    );
  }

  return tasks;
};

// Apply move target-container collision resolution and ordering.
const applyMoveTargetResolution = (tasks, op) => {
  const draggedSet = new Set(op.taskIds);
  const target = op.targetContainer;

  if (target.kind === 'gantt') {
    // Reorder within the target Gantt team based on insertIndex.
    const dragging = tasks.filter(t => draggedSet.has(t.id));
    const nonDragging = tasks.filter(t => !draggedSet.has(t.id));
    const groupNonDragging = nonDragging.filter(t =>
      target.teamId === null ? !t.teamId : t.teamId === target.teamId
    );
    const hIdx = op.insertIndex ?? groupNonDragging.length;
    if (groupNonDragging.length === 0) return [...dragging, ...nonDragging];
    if (hIdx >= groupNonDragging.length) return [...nonDragging, ...dragging];
    const referenceTask = groupNonDragging[hIdx];
    const globalIdx = nonDragging.findIndex(t => t.id === referenceTask.id);
    return [...nonDragging.slice(0, globalIdx), ...dragging, ...nonDragging.slice(globalIdx)];
  }

  if (target.kind === 'lane') {
    const laneTasks = tasks.filter(t => t.laneId === target.laneId);
    const draggedInTarget = laneTasks.filter(t => draggedSet.has(t.id));
    if (draggedInTarget.length === 0) return tasks;

    let updates;
    if (draggedInTarget.length > 1) {
      updates = resolvePushBlock(laneTasks, draggedInTarget.map(t => t.id));
    } else {
      updates = resolvePushOnMove(laneTasks, draggedInTarget[0].id);
    }
    if (updates.length === 0) return tasks;
    const updateMap = new Map(updates.map(u => [u.id, u.startDate]));
    return tasks.map(t => updateMap.has(t.id) ? { ...t, startDate: updateMap.get(t.id) } : t);
  }

  if (target.kind === 'staging') {
    const stagingNonDragging = tasks
      .filter(t => t.teamId === target.teamId && !t.laneId && !draggedSet.has(t.id))
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const dragging = tasks.filter(t => draggedSet.has(t.id));
    if (dragging.length === 0) return tasks;

    const idx = op.stagingInsertIndex != null
      ? Math.max(0, Math.min(stagingNonDragging.length, op.stagingInsertIndex))
      : stagingNonDragging.length;
    const ordered = [
      ...stagingNonDragging.slice(0, idx),
      ...dragging,
      ...stagingNonDragging.slice(idx),
    ];
    const anchor = ordered[0]?.startDate ?? dragging[0].startDate;
    const compacted = compactStagingRow(ordered, anchor);
    const updateMap = new Map(compacted.map(c => [c.id, c.startDate]));
    return tasks.map(t => updateMap.has(t.id) ? { ...t, startDate: updateMap.get(t.id) } : t);
  }

  return tasks;
};

// Re-compact source staging if items left it (sourceContainer === staging,
// targetContainer differs).
const compactSourceStagingIfLeft = (tasks, op) => {
  if (op.type !== 'move') return tasks;
  if (op.sourceContainer.kind !== 'staging') return tasks;
  if (sameContainer(op.sourceContainer, op.targetContainer)) return tasks;
  const staging = getStagingTasks(tasks, op.sourceContainer.teamId);
  if (staging.length === 0) return tasks;
  const anchor = staging[0].startDate;
  const compacted = compactStagingRow(staging, anchor);
  const updateMap = new Map(compacted.map(c => [c.id, c.startDate]));
  return tasks.map(t => updateMap.has(t.id) ? { ...t, startDate: updateMap.get(t.id) } : t);
};

export const projectDrag = (allTasks, op) => {
  if (!op || !op.type || !op.sourceContainer) return allTasks;
  if (op.type === 'move' && !op.targetContainer) return allTasks;

  const movedMap = computeMovedTasks(allTasks, op);
  let next = allTasks.map(t => movedMap.get(t.id) || t);

  if (op.type === 'move') {
    next = applyMoveTargetResolution(next, op);
    next = compactSourceStagingIfLeft(next, op);
  } else {
    next = applyResizeCollisions(next, op);
  }

  return next;
};

// Commit-only normalization: re-index `position` within a Gantt team after a
// move into a Gantt container. Position only matters on save, not preview, so
// it lives outside projectDrag.
export const reindexGanttPositions = (tasks, targetTeamId) => {
  let pos = 0;
  return tasks.map(t => {
    const inGroup = (targetTeamId === null ? !t.teamId : t.teamId === targetTeamId);
    if (inGroup) return { ...t, position: pos++ };
    return t;
  });
};

