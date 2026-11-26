import { useState, useRef, useEffect, useCallback } from 'react';
import { projectDrag, reindexGanttPositions } from '../utils/dragProjection';
import { getTeamTasks } from '../utils/taskFilters';
import { detectHoverTarget } from '../utils/hoverDetection';

// Drag intake — the state machine that owns drag lifecycle (mousedown /
// mousemove / mouseup), hover detection, and source/target container
// inference. Stateful; reacts to DOM events. Does NOT compute new Task
// positions itself — delegates to Drag projection (`projectDrag`) so the
// preview and the commit produce identical state.
//
// Container identity is a tagged union:
//   { kind: 'gantt',   teamId: string | null }   — a Gantt-mode team row
//   { kind: 'lane',    laneId: string }          — a Lane within a Swimlane team
//   { kind: 'staging', teamId: string }          — the Staging row for a Swimlane team

const containerMatchesTask = (container, task) => {
  if (!container) return false;
  if (container.kind === 'gantt') {
    if (container.teamId === null) return !task.teamId;
    return task.teamId === container.teamId;
  }
  if (container.kind === 'lane') return task.laneId === container.laneId;
  if (container.kind === 'staging') return task.teamId === container.teamId && !task.laneId;
  return false;
};

const computeTargetContainer = (hoverTarget, teams) => {
  if (!hoverTarget || hoverTarget.teamId === undefined) return null;
  if (hoverTarget.teamId === null) return { kind: 'gantt', teamId: null };
  const team = (teams || []).find(t => t.id === hoverTarget.teamId);
  if (!team || team.viewMode !== 'swimlane') return { kind: 'gantt', teamId: hoverTarget.teamId };
  if (hoverTarget.laneId) return { kind: 'lane', laneId: hoverTarget.laneId };
  return { kind: 'staging', teamId: hoverTarget.teamId };
};

const computeSourceContainer = (task, teams) => {
  if (!task.teamId) return { kind: 'gantt', teamId: null };
  const team = (teams || []).find(t => t.id === task.teamId);
  if (!team || team.viewMode !== 'swimlane') return { kind: 'gantt', teamId: task.teamId };
  if (task.laneId) return { kind: 'lane', laneId: task.laneId };
  return { kind: 'staging', teamId: task.teamId };
};

export const useDragDrop = ({
  tasks,
  setTasks,
  weeksShown,
  containerRef,
  ROW_HEIGHT,
  ROW_GAP,
  containerWidth,
  teams,
  flushPending,
  commitDirect,
  getSnapshot,
  onResizeCommit,
}) => {
  const [dragState, setDragState] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const [hoverTarget, setHoverTarget] = useState(null);

  const suppressClearRef = useRef(false);
  const dragStartedRef = useRef(false);

  const handleMouseDown = (e, task, type, selectedTaskIds) => {
    if (type !== 'move') {
      e.preventDefault();
    }
    e.stopPropagation();
    flushPending();

    if (type === 'move' && (e.ctrlKey || e.metaKey)) {
      suppressClearRef.current = true;
      window.addEventListener('mouseup', () => {
        setTimeout(() => { suppressClearRef.current = false; }, 50);
      }, { once: true });
      return;
    }

    suppressClearRef.current = true;
    dragStartedRef.current = false;

    // Multi-select only within same drag group (gantt vs swimlane)
    // Staging and lane both belong to the "swimlane" group
    const toDragGroup = (c) => c.kind === 'gantt' ? 'gantt' : 'swimlane';
    const clickedGroup = toDragGroup(computeSourceContainer(task, teams));
    const allSameGroup = selectedTaskIds.every(id => {
      const t = tasks.find(tk => tk.id === id);
      return t && toDragGroup(computeSourceContainer(t, teams)) === clickedGroup;
    });
    const activeTaskIds = (selectedTaskIds.includes(task.id) && allSameGroup)
      ? selectedTaskIds : [task.id];
    const sourceContainer = computeSourceContainer(task, teams);

    setDragState({
      taskIds: activeTaskIds,
      type,
      initialStates: tasks.filter(t => activeTaskIds.includes(t.id)).map(t => ({
        id: t.id, startDate: new Date(t.startDate), duration: t.duration
      })),
      startX: e.clientX,
      startY: e.clientY,
      sourceContainer,
      originalLaneId: task.laneId || null,
      originalTeamId: task.teamId || null
    });
  };

  useEffect(() => {
    if (!dragState || !containerRef.current) return;

    const preventSelect = (e) => e.preventDefault();
    document.addEventListener('selectstart', preventSelect);

    const handleMouseMove = (e) => {
      const weekWidth = (containerWidth || containerRef.current?.getBoundingClientRect().width || 1000) / weeksShown;
      const deltaWeeks = Math.round((e.clientX - dragState.startX) / weekWidth);
      const taskHeight = ROW_HEIGHT + ROW_GAP;
      const deltaY = e.clientY - dragState.startY;

      if (!dragStartedRef.current && (Math.abs(e.clientX - dragState.startX) > 5 || Math.abs(deltaWeeks) >= 1 || Math.abs(Math.round(deltaY / taskHeight)) >= 1)) {
        dragStartedRef.current = true;
      }

      const { teamId: targetTeamId, insertIndex, laneId: targetLaneId, stagingInsertIndex } =
        detectHoverTarget(containerRef.current, e.clientX, e.clientY, dragState.taskIds);

      const newHoverTarget = { teamId: targetTeamId, insertIndex, laneId: targetLaneId, stagingInsertIndex };
      setHoverTarget(newHoverTarget);

      const sourceContainer = dragState.sourceContainer;
      const targetContainer = dragState.type === 'move'
        ? computeTargetContainer(newHoverTarget, teams)
        : sourceContainer;

      if (dragState.type === 'move' && !targetContainer) return;

      const op = {
        type: dragState.type,
        taskIds: dragState.taskIds,
        initialStates: dragState.initialStates,
        deltaWeeks,
        sourceContainer,
        targetContainer,
        insertIndex,
        stagingInsertIndex,
        teams,
      };

      const previewTasks = projectDrag(tasks, op);

      setDragPreview({
        previewTasks,
        draggedTaskIds: dragState.taskIds,
        sourceContainer,
        targetContainer,
      });
    };

    const handleMouseUp = () => {
      const wasResize = dragState.type.startsWith('resize-');
      const resizeTaskId = wasResize ? dragState.taskIds[0] : null;

      try {
        if (dragStartedRef.current && dragPreview && dragPreview.previewTasks) {
          const { teams: currentTeams } = getSnapshot();
          const targetContainer = dragPreview.targetContainer;

          // The preview IS the next state (Drag projection produces full state).
          // Commit-only normalization: re-index Gantt positions when moving into a
          // Gantt container. Positions only matter on save, not preview.
          let newTasks = dragPreview.previewTasks;
          if (dragState.type === 'move' && targetContainer.kind === 'gantt') {
            newTasks = reindexGanttPositions(newTasks, targetContainer.teamId);
          }

          setTasks(newTasks);
          commitDirect?.(newTasks, currentTeams);
        }
      } catch (err) { console.error('Drop error:', err); }

      setHoverTarget(null);
      setDragPreview(null);

      if (wasResize && resizeTaskId != null) {
        onResizeCommit?.({ taskId: resizeTaskId });
      }

      setDragState(null);
      dragStartedRef.current = false;
      setTimeout(() => { suppressClearRef.current = false; }, 50);
    };

    const handleTouchMove = (e) => {
      if (!e.touches[0]) return;
      e.preventDefault();
      handleMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    };

    const handleTouchEnd = (e) => {
      const touch = e.changedTouches[0];
      handleMouseUp({ clientX: touch?.clientX ?? 0, clientY: touch?.clientY ?? 0 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('selectstart', preventSelect);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragState, weeksShown, setTasks, tasks, teams, containerWidth, dragPreview, hoverTarget]);

  const handleTouchStart = (e, task, type, selectedTaskIds) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseDown(
      { clientX: touch.clientX, clientY: touch.clientY, ctrlKey: false, metaKey: false, stopPropagation: () => {}, preventDefault: () => {} },
      task, type, selectedTaskIds
    );
  };

  // Drag preview projection — renderers pass a container tagged union and get
  // back the task list to render. When a drag is active, the preview tasks
  // array IS the next state; we filter by container at read time.
  const getEffectiveTasks = useCallback((container) => {
    const source = dragPreview?.previewTasks ?? tasks;
    if (container.kind === 'gantt') {
      return getTeamTasks(source, container.teamId);
    }
    if (container.kind === 'staging') {
      // Staging renders in startDate order — same as utils/staging.getStagingTasks.
      return source
        .filter(t => t.teamId === container.teamId && !t.laneId)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }
    return source.filter(t => containerMatchesTask(container, t));
  }, [tasks, dragPreview]);

  return {
    dragState,
    setDragState,
    dragPreview,
    hoverTarget,
    suppressClearRef,
    dragStartedRef,
    handleMouseDown,
    handleTouchStart,
    getEffectiveTasks,
  };
};
