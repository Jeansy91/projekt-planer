import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronRight, ChevronUp, ChevronDown, Trash2, GripVertical, Plus, GanttChart, Waves, Pencil } from 'lucide-react';
import SwimlaneView from './SwimlaneView';
import { useTranslation } from 'react-i18next';
import { TASK_INSET, taskBarStyle, taskBarTextClass } from '../utils/constants';
import { gridInnerWidth, taskBoxPx, isTaskBoxOffScreen } from '../utils/taskRowGeometry';
import { getTeamIcon } from './dialogs/TeamDetailModal';

const TaskGrid = ({
  groups,
  tasks,
  teams,
  viewStartDate,
  dragState,
  dragStartedRef,
  dragPreview,
  hoverTarget,
  getEffectiveTasks,
  containerWidth,
  selectedTaskIds,
  weeksShown,
  onMouseDown,
  onTouchStart,
  onToggleCollapse,
  onDeleteTeam,
  onMoveTeamUp,
  onMoveTeamDown,
  onResizeLeft,
  onResizeRight,
  onResizeTouchLeft,
  onResizeTouchRight,
  onSelectTask,
  onSelectToggle,
  onShiftSelect,
  onTaskClick,
  onAddTask,
  onAddStagingTask,
  onAddLane,
  onDeleteLane,
  onRenameLane,
  onMoveLane,
  onEditTeam,
  onShowTaskOverview,
  weekData,
  rowHeight,
  rowGap,
  canEdit = true
}) => {
  const [inlineAddTeamId, setInlineAddTeamId] = useState(undefined);
  const [inlineTitle, setInlineTitle] = useState('');
  const [laneDrag, setLaneDrag] = useState(null);
  const [laneDragTarget, setLaneDragTarget] = useState(null);
  const laneDragStarted = useRef(false);
  const laneDragStartPos = useRef(null);
  const { t } = useTranslation();

  const handleLaneDragStart = useCallback((e, laneId, teamId, laneIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setLaneDrag({ laneId, sourceTeamId: teamId, sourceIndex: laneIndex });
    laneDragStarted.current = false;
    laneDragStartPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!laneDrag) return;

    const handleMouseMove = (e) => {
      if (!laneDragStarted.current && laneDragStartPos.current) {
        const dx = e.clientX - laneDragStartPos.current.x;
        const dy = e.clientY - laneDragStartPos.current.y;
        if (Math.abs(dx) + Math.abs(dy) < 5) return;
        laneDragStarted.current = true;
      }
      if (!laneDragStarted.current) return;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;

      const laneEl = el.closest('[data-lane-id]');
      const teamEl = el.closest('[data-team-id]');

      if (laneEl && teamEl) {
        const targetTeamId = teamEl.getAttribute('data-team-id');
        const targetLaneId = laneEl.getAttribute('data-lane-id');
        if (targetLaneId === laneDrag.laneId) {
          setLaneDragTarget(null);
          return;
        }
        // Find index of the target lane in its team
        const targetTeam = groups.find(g => String(g.id) === targetTeamId);
        if (!targetTeam || (targetTeam.viewMode || 'gantt') !== 'swimlane') return;
        const lanes = targetTeam.lanes || [];
        const targetIdx = lanes.findIndex(l => l.id === targetLaneId);
        // Determine if we're in top or bottom half
        const rect = laneEl.getBoundingClientRect();
        const insertIdx = e.clientY < rect.top + rect.height / 2 ? targetIdx : targetIdx + 1;
        setLaneDragTarget({ teamId: targetTeamId, insertIndex: insertIdx });
      } else if (teamEl) {
        const targetTeamId = teamEl.getAttribute('data-team-id');
        const targetTeam = groups.find(g => String(g.id) === targetTeamId);
        if (!targetTeam || (targetTeam.viewMode || 'gantt') !== 'swimlane') return;
        const lanes = targetTeam.lanes || [];
        setLaneDragTarget({ teamId: targetTeamId, insertIndex: lanes.length });
      } else {
        setLaneDragTarget(null);
      }
    };

    const handleMouseUp = () => {
      if (laneDragStarted.current && laneDragTarget && onMoveLane) {
        onMoveLane(laneDrag.sourceTeamId, laneDragTarget.teamId, laneDrag.laneId, laneDragTarget.insertIndex);
      }
      setLaneDrag(null);
      setLaneDragTarget(null);
      laneDragStarted.current = false;
      laneDragStartPos.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [laneDrag, laneDragTarget, groups, onMoveLane]);

  const totalContainerWidth = gridInnerWidth(containerWidth);

  const isInlineActive = (groupId) => inlineAddTeamId !== undefined && String(inlineAddTeamId) === String(groupId);

  const handleInlineSubmit = (teamId) => {
    if (inlineTitle.trim()) {
      const group = groups.find(g => String(g.id) === String(teamId));
      if (group && (group.viewMode || 'gantt') === 'swimlane') {
        onAddStagingTask(inlineTitle.trim(), teamId);
      } else {
        onAddTask(inlineTitle.trim(), teamId);
      }
    }
    setInlineTitle('');
    setInlineAddTeamId(undefined);
  };

  const handleInlineKeyDown = (e, teamId) => {
    if (e.key === 'Enter') {
      handleInlineSubmit(teamId);
    } else if (e.key === 'Escape') {
      setInlineTitle('');
      setInlineAddTeamId(undefined);
    }
  };

  return (
    <div className="relative pt-2 select-none">
      {groups.map((group, gIdx) => {
        const draggingIds = dragState?.taskIds || [];
        let groupTasks = getEffectiveTasks({ kind: 'gantt', teamId: group.id ?? null })
          .slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const collapsed = group.id === null ? Boolean(group.collapsed) : Boolean(groups.find(g => g.id === group.id)?.collapsed);

        if (dragState && dragStartedRef.current && (group.viewMode || 'gantt') === 'gantt') {
          const draggingTasks = groupTasks.filter(t => draggingIds.includes(t.id));
          const nonDragging = groupTasks.filter(t => !draggingIds.includes(t.id));

          if (hoverTarget && String(hoverTarget.teamId) === String(group.id) && hoverTarget.insertIndex != null) {
            const idx = Math.max(0, Math.min(nonDragging.length, hoverTarget.insertIndex));
            groupTasks = [...nonDragging.slice(0, idx), ...draggingTasks, ...nonDragging.slice(idx)];
          } else if (hoverTarget && String(hoverTarget.teamId) === String(group.id)) {
            groupTasks = [...nonDragging, ...draggingTasks];
          } else {
            groupTasks = nonDragging;
          }
        }

        const teamColor = group.color || 'slate';
        const TeamIcon = group.id !== null ? getTeamIcon(group.icon) : null;
        const isUnassigned = group.id === null;

        return (
          <div key={String(group.id) || `g-${gIdx}`} data-team-id={group.id ?? 'null'} className="mb-2">
            {/* Team header — sticky */}
            <div className={`sticky top-0 z-30 ${isUnassigned ? 'bg-white/95 dark:bg-slate-800/95' : `bg-${teamColor}-50/95 dark:bg-${teamColor}-500/20`} backdrop-blur-xl rounded-lg mx-1 border ${isUnassigned ? 'border-slate-100 dark:border-slate-700/50' : `border-${teamColor}-200/60 dark:border-${teamColor}-700`}`}>
              <div className="flex items-center gap-2 px-3 py-1.5">
                {/* Color stripe + icon */}
                <div className="flex items-center gap-2.5">
                  <button onClick={() => onToggleCollapse(group.id)} className="p-0.5" title={collapsed ? t('teams.expand') : t('teams.collapse')}>
                    <ChevronRight size={14} className={`text-slate-400 dark:text-slate-300 ${collapsed ? 'rotate-0' : 'rotate-90'} transition-transform`} />
                  </button>
                  {!isUnassigned && TeamIcon && (
                    <div className={`w-7 h-7 rounded-md bg-${teamColor}-600 flex items-center justify-center text-white shrink-0`}>
                      <TeamIcon size={14} />
                    </div>
                  )}
                </div>

                {/* Name and task count */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      data-testid="team-name"
                      className={`text-sm leading-tight truncate ${isUnassigned ? 'font-medium text-slate-400 dark:text-slate-500 italic' : `font-bold text-${teamColor}-900 dark:text-${teamColor}-100`}`}
                    >
                      {group.name}
                    </span>
                    {!isUnassigned && (
                      <span className={`text-[10px] font-medium uppercase tracking-wider text-${teamColor}-600 dark:text-${teamColor}-400`}>
                        {(group.viewMode || 'gantt') === 'gantt' ? <GanttChart size={11} className="inline" /> : <Waves size={11} className="inline" />}
                      </span>
                    )}
                  </div>
                  <button
                    data-testid={`team-task-count-${group.id ?? 'null'}`}
                    onClick={() => group.id !== null && onShowTaskOverview?.(group)}
                    className={`text-[11px] leading-tight text-left ${isUnassigned ? 'text-slate-400 dark:text-slate-500' : `text-${teamColor}-600 dark:text-${teamColor}-400 hover:text-${teamColor}-800 dark:hover:text-${teamColor}-300 cursor-pointer`} transition-colors`}
                  >
                    {t('teams.taskCount', { count: groupTasks.length })}
                  </button>
                </div>

                {/* Action buttons */}
                <div className="ml-auto flex items-center gap-0.5">
                  {!isUnassigned && canEdit && (
                    <>
                      <button
                        data-testid={`team-up-${group.id}`}
                        onClick={() => onMoveTeamUp(group.id)}
                        disabled={gIdx === 0}
                        className={`p-1 rounded transition-colors ${gIdx === 0 ? 'text-slate-200 dark:text-slate-600 cursor-not-allowed' : `text-${teamColor}-500 hover:text-${teamColor}-700 hover:bg-${teamColor}-100 dark:hover:bg-${teamColor}-900/40`}`}
                        title={t('teams.moveUp')}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        data-testid={`team-down-${group.id}`}
                        onClick={() => onMoveTeamDown(group.id)}
                        disabled={gIdx >= groups.length - 2}
                        className={`p-1 rounded transition-colors ${gIdx >= groups.length - 2 ? 'text-slate-200 dark:text-slate-600 cursor-not-allowed' : `text-${teamColor}-500 hover:text-${teamColor}-700 hover:bg-${teamColor}-100 dark:hover:bg-${teamColor}-900/40`}`}
                        title={t('teams.moveDown')}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        data-testid={`team-edit-${group.id}`}
                        onClick={() => onEditTeam?.(group)}
                        className={`p-1 rounded text-${teamColor}-500 hover:text-${teamColor}-700 hover:bg-${teamColor}-100 dark:hover:bg-${teamColor}-900/40 transition-colors`}
                        title={t('dialogs.teamDetail.title')}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        data-testid={`team-delete-${group.id}`}
                        onClick={() => onDeleteTeam(group.id)}
                        className={`p-1 rounded text-${teamColor}-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors`}
                        title={t('teams.deleteTeam')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!collapsed && (group.viewMode || 'gantt') === 'swimlane' && (
              <SwimlaneView
                group={group}
                tasks={tasks}
                teams={teams}
                viewStartDate={viewStartDate}
                weeksShown={weeksShown}
                containerWidth={containerWidth}
                selectedTaskIds={selectedTaskIds}
                dragState={dragState}
                dragPreview={dragPreview}
                dragStartedRef={dragStartedRef}
                getEffectiveTasks={getEffectiveTasks}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                onResizeLeft={onResizeLeft}
                onResizeRight={onResizeRight}
                onResizeTouchLeft={onResizeTouchLeft}
                onResizeTouchRight={onResizeTouchRight}
                onSelectTask={onSelectTask}
                onSelectToggle={onSelectToggle}
                onShiftSelect={onShiftSelect}
                onTaskClick={onTaskClick}
                onAddLane={onAddLane}
                onDeleteLane={onDeleteLane}
                onRenameLane={onRenameLane}
                onAddStagingTask={onAddStagingTask}
                onLaneDragStart={handleLaneDragStart}
                laneDrag={laneDrag}
                laneDragTarget={laneDragTarget}
                rowHeight={rowHeight}
                rowGap={rowGap}
                canEdit={canEdit}
              />
            )}

            {!collapsed && (group.viewMode || 'gantt') === 'gantt' && (
              <div className="relative my-2 overflow-x-hidden" style={{ minHeight: rowHeight * Math.max(1, groupTasks.length) + (groupTasks.length - 1) * rowGap + 8, paddingTop: 4, paddingBottom: 4 }}>
                {groupTasks.map((task, idx) => {
                  const { leftPx, widthPx } = taskBoxPx({ task, viewStartDate, weeksShown, innerWidth: totalContainerWidth });
                  const topPx = idx * (rowHeight + rowGap) + 4;
                  if (isTaskBoxOffScreen({ leftPx, widthPx }, totalContainerWidth)) return null;
                  const isDragging = Boolean(dragState?.taskIds && dragState.taskIds.includes(task.id));
                  const previewBoxWidth = leftPx < 0 ? Math.max(0, widthPx + leftPx - 4) : 0;
                  const isSelected = selectedTaskIds.includes(task.id) || isDragging;

                  return (
                    <div key={task.id} style={{ position: 'absolute', left: 0, right: 0, top: topPx, height: rowHeight }}>
                      {leftPx < 0 && (
                        <div className="absolute left-0 top-0 h-full flex items-center overflow-hidden pointer-events-none" style={{ zIndex: 5, width: `${previewBoxWidth}px`, minWidth: 0 }}>
                          <span
                            className={`${taskBarTextClass(task.color)} text-[11px] font-bold select-none`}
                            style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', minWidth: 0, paddingLeft: '1.7rem', display: 'block', width: '100%' }}
                          >
                            {task.title}
                          </span>
                        </div>
                      )}
                      <div
                        data-task-id={task.id}
                        aria-selected={isSelected}
                        className={`absolute h-full rounded-lg task-bar hover:brightness-105 text-[11px] font-bold shadow-sm transition-shadow ${taskBarTextClass(task.color)} ${isSelected ? `${canEdit ? 'cursor-grabbing' : 'cursor-default'} outline-2 outline-offset-1 outline-slate-400` : canEdit ? 'cursor-grab' : 'cursor-default'}`}
                        style={{ ...taskBarStyle(task.color), left: `${leftPx + TASK_INSET}px`, width: `${widthPx - TASK_INSET * 2}px`, top: 0, transition: dragState ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        onMouseDown={(e) => onMouseDown(e, task, 'move')}
                        onTouchStart={(e) => onTouchStart?.(e, task, 'move')}
                        onClick={(e) => onTaskClick(e, task.id)}
                      >
                        <div className="flex items-center w-full h-full relative rounded-lg px-2 overflow-hidden">
                          <GripVertical size={12} className={`mr-1 shrink-0 ${canEdit ? 'opacity-30 dark:opacity-60' : 'opacity-0'}`} />
                          {canEdit ? <div className="absolute left-0 w-2 h-full cursor-ew-resize hover:bg-white/20 z-10" onMouseDown={(e) => onResizeLeft(e, task)} onTouchStart={(e) => onResizeTouchLeft?.(e, task)} /> : null}
                          <div className="flex-1 min-w-0 overflow-hidden pointer-events-none">
                            <span className="whitespace-nowrap truncate select-none block" style={{ lineHeight: `${rowHeight}px` }}>
                              {leftPx < 0 ? '' : task.title}
                            </span>
                          </div>
                          {canEdit ? <div className="absolute right-0 w-2 h-full cursor-ew-resize hover:bg-white/20 z-10" onMouseDown={(e) => onResizeRight(e, task)} onTouchStart={(e) => onResizeTouchRight?.(e, task)} /> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!collapsed && (group.viewMode || 'gantt') === 'gantt' && canEdit && (
              <div className="mx-1 mb-3">
                {isInlineActive(group.id) ? (
                  <div className="flex items-center gap-2 h-9">
                    <input
                      autoFocus
                      data-testid="task-name-input"
                      className="flex-1 px-3 py-1.5 text-sm border-2 border-blue-400 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 dark:text-slate-100"
                      placeholder={t('tasks.placeholders.enterName')}
                      value={inlineTitle}
                      onChange={(e) => setInlineTitle(e.target.value)}
                      onKeyDown={(e) => handleInlineKeyDown(e, group.id)}
                      onBlur={() => { setInlineTitle(''); setInlineAddTeamId(undefined); }}
                    />
                  </div>
                ) : (
                  <button
                    data-testid={`add-task-${group.id ?? 'null'}`}
                    onClick={() => setInlineAddTeamId(group.id)}
                    className="w-full h-9 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition-colors text-xs font-medium"
                  >
                    <Plus size={14} />
                    {t('tasks.actions.newTask')}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TaskGrid;
