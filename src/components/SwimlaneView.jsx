import React, { useState } from 'react';
import { GripVertical, Plus, Trash2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TASK_INSET, taskBarStyle, taskBarTextClass } from '../utils/constants';
import { gridInnerWidth, taskBoxPx, isTaskBoxOffScreen } from '../utils/taskRowGeometry';
import DeleteConfirmDialog from './dialogs/DeleteConfirmDialog';

const LANE_LABEL_WIDTH = 120;

const SwimlaneView = ({
  group,
  tasks,
  teams,
  viewStartDate,
  weeksShown,
  containerWidth,
  selectedTaskIds,
  dragState,
  dragPreview,
  dragStartedRef,
  onMouseDown,
  onTouchStart,
  onResizeLeft,
  onResizeRight,
  onResizeTouchLeft,
  onResizeTouchRight,
  onSelectTask,
  onSelectToggle,
  onShiftSelect,
  onTaskClick,
  onAddLane,
  onDeleteLane,
  onRenameLane,
  onAddStagingTask,
  onLaneDragStart,
  laneDrag,
  laneDragTarget,
  rowHeight,
  rowGap,
  canEdit = true,
  getEffectiveTasks,
}) => {
  const { t } = useTranslation();
  const [newLaneName, setNewLaneName] = useState('');
  const [showLaneInput, setShowLaneInput] = useState(false);
  const [editingLaneId, setEditingLaneId] = useState(null);
  const [editingLaneName, setEditingLaneName] = useState('');
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [deletingLaneId, setDeletingLaneId] = useState(null);

  const lanes = group.lanes || [];
  const teamColor = group.color || 'slate';
  const totalWidth = gridInnerWidth(containerWidth);

  const handleAddLane = () => {
    if (newLaneName.trim()) {
      onAddLane(group.id, newLaneName.trim());
      setNewLaneName('');
      setShowLaneInput(false);
    }
  };

  const handleLaneKeyDown = (e) => {
    if (e.key === 'Enter') handleAddLane();
    if (e.key === 'Escape') { setNewLaneName(''); setShowLaneInput(false); }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddStagingTask(newTaskTitle.trim(), group.id);
      setNewTaskTitle('');
      setShowTaskInput(false);
    }
  };

  const handleTaskKeyDown = (e) => {
    if (e.key === 'Enter') handleAddTask();
    if (e.key === 'Escape') { setNewTaskTitle(''); setShowTaskInput(false); }
  };

  const draggingIds = dragState?.taskIds || [];
  const isDragging = dragState && dragStartedRef?.current && draggingIds.length > 0;
  const isTargetLane = (laneId) =>
    isDragging && dragPreview?.targetContainer?.kind === 'lane' && dragPreview.targetContainer.laneId === laneId;

  const isLaneDragging = laneDrag?.laneId != null;
  const isDraggedLane = (laneId) => laneDrag?.laneId === laneId;
  const isLaneDropTarget = (laneIdx) => {
    if (!laneDragTarget || String(laneDragTarget.teamId) !== String(group.id)) return false;
    return laneDragTarget.insertIndex === laneIdx;
  };
  const isLaneDropAfterLast = laneDragTarget && String(laneDragTarget.teamId) === String(group.id) && laneDragTarget.insertIndex === lanes.length;

  return (
    <div className="my-2">
      {lanes.map((lane, laneIdx) => {
        const laneTasks = getEffectiveTasks({ kind: 'lane', laneId: lane.id });
        const isHoverTarget = isTargetLane(lane.id);

        const laneHeight = rowHeight + 8;

        return (
          <div key={lane.id} data-lane-id={lane.id} className={`relative group/lane border-b border-${teamColor}-100/40 dark:border-${teamColor}-700/10 last:border-b-0 ${isHoverTarget ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''} ${isDraggedLane(lane.id) ? 'opacity-40' : ''}`}>
            {isLaneDropTarget(laneIdx) && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-30" />
            )}
            {/* Task area — full width, tasks positioned absolutely */}
            <div
              className="relative w-full overflow-hidden"
              style={{ minHeight: laneHeight, paddingTop: 4, paddingBottom: 4 }}
            >
              {laneTasks.map((task) => {
                const { leftPx, widthPx } = taskBoxPx({ task, viewStartDate, weeksShown, innerWidth: totalWidth });
                const topPx = 4;

                if (isTaskBoxOffScreen({ leftPx, widthPx }, totalWidth)) return null;

                const isTaskDragging = Boolean(dragState?.taskIds && dragState.taskIds.includes(task.id));
                const isPreview = isHoverTarget && isTaskDragging;
                const isSelected = selectedTaskIds.includes(task.id) || isTaskDragging;

                return (
                  <div
                    key={task.id}
                    data-task-id={task.id}
                    aria-selected={isSelected}
                    className={`absolute rounded-lg task-bar ${isPreview ? 'opacity-50' : ''} hover:brightness-105 text-[11px] font-bold shadow-sm transition-shadow ${taskBarTextClass(task.color)} ${isSelected ? `${canEdit ? 'cursor-grabbing' : 'cursor-default'} outline-2 outline-offset-1 outline-slate-400` : canEdit ? 'cursor-grab' : 'cursor-default'} ${isPreview ? 'border-2 border-dashed border-slate-400/60 dark:border-slate-500/60' : ''}`}
                    style={{
                      ...taskBarStyle(task.color),
                      left: `${leftPx + TASK_INSET}px`,
                      width: `${widthPx - TASK_INSET * 2}px`,
                      top: topPx,
                      height: rowHeight,
                      transition: dragState ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseDown={(e) => onMouseDown(e, task, 'move')}
                    onTouchStart={(e) => onTouchStart?.(e, task, 'move')}
                    onClick={(e) => onTaskClick(e, task.id)}
                  >
                    <div className="flex items-center w-full h-full relative rounded-lg px-2 overflow-hidden">
                      {canEdit ? <div className="absolute left-0 w-2 h-full cursor-ew-resize hover:bg-white/20 z-10" onMouseDown={(e) => onResizeLeft(e, task)} onTouchStart={(e) => onResizeTouchLeft?.(e, task)} /> : null}
                      <GripVertical size={12} className={`mr-1 shrink-0 ${canEdit ? 'opacity-30 dark:opacity-60' : 'opacity-0'}`} />
                      <div className="flex-1 min-w-0 overflow-hidden pointer-events-none">
                        <span className="whitespace-nowrap truncate select-none block leading-none">
                          {task.title}
                        </span>
                      </div>
                      {canEdit ? <div className="absolute right-0 w-2 h-full cursor-ew-resize hover:bg-white/20 z-10" onMouseDown={(e) => onResizeRight(e, task)} onTouchStart={(e) => onResizeTouchRight?.(e, task)} /> : null}
                    </div>
                  </div>
                );
              })}

              {/* Lane name badge — floating over tasks, styled to match team header */}
              <div
                className="absolute top-1/2 -translate-y-1/2 left-1 z-20 group/badge pointer-events-auto"
              >
                {editingLaneId === lane.id ? (
                  <div
                    className={`flex items-center bg-${teamColor}-50 dark:bg-${teamColor}-800 border border-${teamColor}-200/60 dark:border-${teamColor}-700 rounded-md shadow-sm px-2`}
                    style={{ height: rowHeight - 4 }}
                  >
                    <input
                      autoFocus
                      data-testid="lane-rename-input"
                      className={`text-xs font-bold text-${teamColor}-800 dark:text-${teamColor}-100 bg-transparent border-none outline-none`}
                      style={{ width: LANE_LABEL_WIDTH - 24 }}
                      value={editingLaneName}
                      onChange={(e) => setEditingLaneName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editingLaneName.trim()) onRenameLane(group.id, lane.id, editingLaneName.trim());
                          setEditingLaneId(null);
                        } else if (e.key === 'Escape') {
                          setEditingLaneId(null);
                        }
                      }}
                      onBlur={() => {
                        if (editingLaneName.trim()) onRenameLane(group.id, lane.id, editingLaneName.trim());
                        setEditingLaneId(null);
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className={`flex items-center bg-${teamColor}-50 dark:bg-${teamColor}-800 border border-${teamColor}-200/60 dark:border-${teamColor}-700 rounded-md shadow-sm px-1 w-[90px] ${canEdit ? 'group-hover/badge:w-auto' : ''}`}
                    style={{ height: rowHeight - 4 }}
                    onDoubleClick={canEdit ? () => {
                      setEditingLaneId(lane.id);
                      setEditingLaneName(lane.name);
                    } : undefined}
                  >
                    {canEdit && <div
                      data-testid={`lane-drag-handle-${lane.id}`}
                      className={`cursor-grab active:cursor-grabbing p-0.5 text-${teamColor}-400 dark:text-${teamColor}-400 hover:text-${teamColor}-700 dark:hover:text-white transition-colors shrink-0`}
                      onMouseDown={(e) => onLaneDragStart(e, lane.id, group.id, laneIdx)}
                    >
                      <GripVertical size={11} />
                    </div>}
                    <span
                      data-testid="lane-name"
                      className={`text-xs font-bold text-${teamColor}-800 dark:text-${teamColor}-100 truncate whitespace-nowrap select-none px-1`}
                      title={lane.name}
                    >
                      {lane.name}
                    </span>
                    {canEdit && (
                      <div className="hidden group-hover/badge:flex touch:flex items-center gap-0.5 ml-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingLaneId(lane.id); setEditingLaneName(lane.name); }}
                          className={`p-0.5 rounded text-${teamColor}-400 dark:text-${teamColor}-400 hover:text-${teamColor}-700 dark:hover:text-white hover:bg-${teamColor}-100 dark:hover:bg-${teamColor}-900/40 transition-colors`}
                          title={t('lanes.renameLane')}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          data-testid={`delete-lane-${lane.id}`}
                          onClick={(e) => { e.stopPropagation(); setDeletingLaneId(lane.id); }}
                          className="p-0.5 rounded text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title={t('lanes.deleteLane')}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })}

      {isLaneDropAfterLast && (
        <div className="relative h-0.5 bg-blue-500 mx-1 z-30" />
      )}

      {/* Add lane button */}
      {canEdit && <div className="mx-1 mt-1 mb-1">
        {showLaneInput ? (
          <div className="flex items-center gap-2 h-9">
            <input
              autoFocus
              data-testid="lane-name-input"
              className="flex-1 px-3 py-1.5 text-sm border-2 border-blue-400 dark:border-blue-500 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 dark:text-slate-100"
              placeholder={t('lanes.lanePlaceholder')}
              value={newLaneName}
              onChange={(e) => setNewLaneName(e.target.value)}
              onKeyDown={handleLaneKeyDown}
              onBlur={() => { setNewLaneName(''); setShowLaneInput(false); }}
            />
          </div>
        ) : (
          <button
            data-testid={`add-lane-${group.id}`}
            onClick={() => setShowLaneInput(true)}
            className="w-full h-9 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors text-xs font-medium"
          >
            <Plus size={14} />
            {t('lanes.addLane')}
          </button>
        )}
      </div>}

      {/* Staging row — unassigned tasks (laneId === null) */}
      {(() => {
        const stagingTasks = getEffectiveTasks({ kind: 'staging', teamId: group.id });
        if (stagingTasks.length === 0) return null;
        return (
          <div data-staging-row={group.id} className="border-t border-dashed border-slate-200 dark:border-slate-700/40">
            {/* Staging label — above the row like a team name */}
            <div className="px-2 pt-1 pb-0.5">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic select-none">
                {t('lanes.staging')}
              </span>
            </div>
            <div
              className="flex items-center w-full overflow-hidden"
              style={{ minHeight: rowHeight + 8, paddingTop: 4, paddingBottom: 4 }}
            >
              {stagingTasks.map(task => {
                const widthPx = (task.duration / weeksShown) * totalWidth;
                const isTaskDragging = Boolean(dragState?.taskIds && dragState.taskIds.includes(task.id));
                const isSelected = selectedTaskIds.includes(task.id) || isTaskDragging;

                return (
                  <div
                    key={task.id}
                    data-task-id={task.id}
                    aria-selected={isSelected}
                    data-staging="true"
                    className={`relative shrink-0 rounded-lg task-bar hover:brightness-105 text-[11px] font-bold shadow-sm transition-shadow ${isSelected ? `${canEdit ? 'cursor-grabbing' : 'cursor-default'} outline-2 outline-offset-1 outline-slate-400` : canEdit ? 'cursor-grab' : 'cursor-default'}`}
                    style={{
                      ...taskBarStyle(task.color),
                      width: `${widthPx - TASK_INSET * 2}px`,
                      height: rowHeight,
                      marginLeft: TASK_INSET,
                      marginRight: TASK_INSET,
                      transition: dragState ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseDown={(e) => onMouseDown(e, task, 'move')}
                    onClick={(e) => onTaskClick(e, task.id)}
                  >
                    <div className="flex items-center w-full h-full relative rounded-lg px-2 overflow-hidden">
                      <GripVertical size={12} className={`mr-1 shrink-0 ${canEdit ? 'opacity-30 dark:opacity-60' : 'opacity-0'}`} />
                      <div className="flex-1 min-w-0 overflow-hidden pointer-events-none">
                        <span className="whitespace-nowrap truncate select-none block leading-none">
                          {task.title}
                        </span>
                      </div>
                      {canEdit ? <div className="absolute right-0 w-2 h-full cursor-ew-resize hover:bg-white/20 z-10" onMouseDown={(e) => onResizeRight(e, task)} /> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Add task button */}
      {canEdit && <div className="mx-1 mt-1 mb-1">
        {showTaskInput ? (
          <div className="flex items-center gap-2 h-9">
            <input
              autoFocus
              data-testid="task-name-input"
              className="flex-1 px-3 py-1.5 text-sm border-2 border-blue-400 dark:border-blue-500 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 dark:text-slate-100"
              placeholder={t('tasks.placeholders.enterName')}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleTaskKeyDown}
              onBlur={() => { setNewTaskTitle(''); setShowTaskInput(false); }}
            />
          </div>
        ) : (
          <button
            data-testid={`add-task-${group.id}`}
            onClick={() => setShowTaskInput(true)}
            className="w-full h-9 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors text-xs font-medium"
          >
            <Plus size={14} />
            {t('tasks.actions.newTask')}
          </button>
        )}
      </div>}

      <DeleteConfirmDialog
        show={deletingLaneId !== null}
        onClose={() => setDeletingLaneId(null)}
        onConfirm={() => { onDeleteLane(group.id, deletingLaneId); setDeletingLaneId(null); }}
        message={t('dialogs.delete.laneMessage')}
      />
    </div>
  );
};

export default SwimlaneView;
