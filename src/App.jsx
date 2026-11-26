import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { version, name as packageName } from '../package.json';

import { useProjectStore } from './hooks/useProjectStore';
import { useDragDrop } from './hooks/useDragDrop';
import { useContainerResize } from './hooks/useContainerResize';
import { useCalendarData } from './hooks/useCalendarData';
import { useTaskSelection } from './hooks/useTaskSelection';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDeleteWorkflow } from './hooks/useDeleteWorkflow';
import { useCloudSync } from './hooks/useCloudSync';
import { useProjectViewState, useProjectViewSave } from './hooks/useProjectView';
import { useUserDensity } from './hooks/useUserDensity';
import { useViewGestures } from './hooks/useViewGestures';
import { useSplitDivider } from './hooks/useSplitDivider';
import { useCloudBoot } from './hooks/useCloudBoot';
import { usePersistence } from './persistence/usePersistence';
import { loadHistory as loadHistoryFromDB } from './utils/historyDB';

import { DENSITY_LEVELS } from './utils/constants';
import { compactStagingRow, getStagingTasks } from './utils/staging';

import ProjectHeader from './components/ProjectHeader';
import CalendarHeader from './components/CalendarHeader';
import TaskGrid from './components/TaskGrid';
import TaskDetailsPanel from './components/TaskDetailsPanel';
import { DeleteConfirmDialog, AddTeamModal, TeamDetailModal, TaskOverviewModal, InfoModal, HistoryModal, IncludeHistoryDialog, AuthModal, ShareProjectModal } from './components/dialogs';
import { Plus, GripVertical, Loader2 } from 'lucide-react';

const App = ({ auth, sbProject, theme, onThemeChange, isCloudAvailable, isCloudAvailabilityChecked }) => {
  const { projectId: urlProjectId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language === 'en' ? 'en-US' : 'de-DE';

  const { user, profile, loading: authLoading, isAuthenticated, mfaRequired, isSupabaseConfigured, passwordRecovery, checkEmailExists, signInWithPassword, signUp, signOut, resetPasswordForEmail, updatePassword, updateProfile, getMfaFactors, verifyMfa } = auth;

  const [storageType, setStorageType] = useState(null); // null | 'local' | 'file' | 'cloud'

  // ── Central store ─────────────────────────────────────────────────────
  const handleHistoryCommit = useCallback((pid, entries) => {
    if (storageType === 'cloud' && sbProject) {
      sbProject.insertHistory(pid, entries).catch(() => {});
    }
  }, [storageType, sbProject]);

  const handleHistoryDelete = useCallback((entryIds) => {
    if (storageType === 'cloud' && sbProject) {
      sbProject.deleteHistoryEntries(entryIds).catch(() => sbProject.deleteHistoryEntries(entryIds).catch(() => {}));
    }
  }, [storageType, sbProject]);

  // ── Per-user View (viewStartDate / weeksShown / unassignedCollapsed) ──
  // Owned in useProjectView; setters threaded into the store so useProjectLifecycle
  // can drive them on open / new / import. See useProjectView.js.
  const view = useProjectViewState();
  const {
    viewStartDate: viewStartDateIso, setViewStartDate,
    weeksShown, setWeeksShown,
    unassignedCollapsed: unassignedGroupCollapsed, setUnassignedCollapsed: setUnassignedGroupCollapsed,
  } = view;

  const store = useProjectStore({
    user,
    onHistoryCommit: handleHistoryCommit,
    onHistoryDelete: handleHistoryDelete,
    setViewStartDate, setWeeksShown,
    setUnassignedCollapsed: setUnassignedGroupCollapsed,
  });
  const {
    projectId, setProjectId, projectTitle, setProjectTitle,
    tasks, setTasks, teams, setTeams,
    density, setDensity,
    fileHandle, setFileHandle, saveStatus, setSaveStatus,
    initialLoadDone,
    history, setHistory,
    addTask, addStagingTask, updateTask, deleteTask, duplicateTasks,
    addTeam, updateTeam, deleteTeam, toggleCollapse,
    moveTeamUp, moveTeamDown, addLane, deleteLane, renameLane, moveLane,
    newProject, openProject, importFromJson, exportProject,
    undo, redo, canUndo, canRedo, undoDepth, suppressDetection, flushPending, commitDirect, getSnapshot, restoreToEntry, canRestoreEntry,
  } = store;

  // ── User-level density (per user, not per project; different DB table) ─
  useUserDensity(density, setDensity, user, sbProject);

  // ── Local UI state ────────────────────────────────────────────────────
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [taskOverviewTeam, setTaskOverviewTeam] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [includeHistoryInFile, setIncludeHistoryInFile] = useState(false);
  const [pendingHistoryAction, setPendingHistoryAction] = useState(null); // 'export' | 'newFile' | null
  const [cloudOwnerId, setCloudOwnerId] = useState(null);
  const [projectRole, setProjectRole] = useState(null); // 'owner' | 'admin' | 'editor' | 'viewer' | null

  const splitContainerRef = useRef(null);
  const splitDividerRef = useRef(null);

  const containerRef = useRef(null);
  const colorPickerRef = useRef(null);
  const zoomMenuRef = useRef(null);
  const shiftViewRef = useRef(null);

  // ── Composed hooks ────────────────────────────────────────────────────
  const { containerWidth, scrollbarWidth } = useContainerResize(containerRef);
  const { rowHeight, rowGap } = DENSITY_LEVELS[density] || DENSITY_LEVELS[0];
  const { detailsPanelWidth } = useSplitDivider(splitContainerRef, splitDividerRef);

  const maxWeeks = useMemo(() => {
    if (containerWidth > 0 && containerWidth < 480) return 12;
    if (containerWidth > 0 && containerWidth < 768) return 26;
    return 52;
  }, [containerWidth]);

  useEffect(() => {
    if (weeksShown > maxWeeks) setWeeksShown(maxWeeks);
  }, [maxWeeks]);

  const { viewStartDate, shiftView, goToToday, monthHeaders, weekData, monthBoundarySet, currentWeekIdx } =
    useCalendarData(viewStartDateIso, weeksShown, currentLocale, setViewStartDate);
  shiftViewRef.current = shiftView;

  const {
    editingTaskId, setEditingTaskId,
    selectedTaskIds, setSelectedTaskIds,
    handleSelectTask, handleSelectToggle, handleShiftSelect, handleTaskClick,
  } = useTaskSelection(tasks);

  const handleResizeCommit = useCallback(({ taskId }) => {
    setSelectedTaskIds([taskId]);
    setEditingTaskId(taskId);
  }, []);

  const {
    dragState, dragPreview, hoverTarget,
    suppressClearRef, dragStartedRef,
    handleMouseDown: dragHandleMouseDown,
    handleTouchStart: dragHandleTouchStart,
    getEffectiveTasks,
  } = useDragDrop({
    tasks, setTasks, weeksShown, containerRef,
    ROW_HEIGHT: rowHeight, ROW_GAP: rowGap, containerWidth, teams,
    flushPending, commitDirect, getSnapshot,
    onResizeCommit: handleResizeCommit,
  });

  const {
    showDeleteConfirm, deleteTargetId, deleteTargetType,
    requestDeleteTask, requestDeleteTeam, requestDeleteTasks,
    cancelDelete, deleteTaskWithCompact
  } = useDeleteWorkflow(tasks, teams, setTasks, editingTaskId, setEditingTaskId, deleteTask, viewStartDateIso);

  const handleDuplicate = (taskIds) => {
    const newIds = duplicateTasks(taskIds);
    if (newIds.length > 0) {
      setSelectedTaskIds(newIds);
      setEditingTaskId(newIds[0]);
    }
  };

  // ── Cloud sync (bidirectional) ──────────────────────────────────────
  const cloudEnabled = storageType === 'cloud';
  const collapsedTeamIds = useMemo(() => teams.filter(t => t.collapsed).map(t => t.id), [teams]);
  const { activeUsers, seedTitleBaseline } = useCloudSync({
    enabled: cloudEnabled,
    projectId,
    sbProject,
    user,
    profile,
    tasks,
    teams,
    projectTitle,
    setTasks,
    setTeams,
    setProjectTitle,
    suppressDetection,
  });
  useProjectViewSave({
    enabled: cloudEnabled,
    projectId,
    sbProject,
    viewStartDate: viewStartDateIso,
    weeksShown,
    collapsedTeamIds,
    unassignedCollapsed: unassignedGroupCollapsed,
  });

  // ── Persistence — auto-save to local disk (localStorage / FileSystem) ─
  usePersistence({
    state: { projectId, projectTitle, tasks, teams, unassignedGroupCollapsed, viewStartDate: viewStartDateIso, weeksShown, density, history },
    storageType,
    fileHandle,
    setSaveStatus,
    initialLoadDone,
    includeHistoryInFile,
  });

  // ── Load history based on storage type ─────────────────────────────
  const historyLoadedRef = useRef(null);
  useEffect(() => {
    if (!storageType || !projectId || historyLoadedRef.current === projectId) return;
    historyLoadedRef.current = projectId;

    if (storageType === 'local') {
      loadHistoryFromDB(projectId).then(h => setHistory(h || [])).catch(() => {});
    } else if (storageType === 'cloud' && sbProject) {
      sbProject.loadHistory(projectId).then(h => setHistory(h || [])).catch(() => {});
    }
    // file: history is loaded from the JSON via applyProjectData/setHistory
  }, [storageType, projectId]);

  // Load project based on URL parameter
  const { isProjectLoading } = useCloudBoot({
    urlProjectId, user, sbProject, authLoading, isSupabaseConfigured, isCloudAvailable,
    isCloudAvailabilityChecked,
    setProjectId, setProjectTitle, setTasks, setTeams,
    setUnassignedGroupCollapsed, setViewStartDate, setWeeksShown,
    setCloudOwnerId, setProjectRole, setStorageType,
    viewStartDateIso, openProject, newProject, importFromJson, setFileHandle,
    onAskIncludeHistory: () => setPendingHistoryAction('newFile'),
    suppressDetection,
    seedTitleBaseline,
  });

  // Nothing is editable until the project is fully loaded (title, teams and tasks are applied together)
  const canEdit = !isProjectLoading && (storageType !== 'cloud' || (projectRole !== 'viewer' && isCloudAvailable));

  useKeyboardShortcuts(tasks, selectedTaskIds, setSelectedTaskIds, showDeleteConfirm, requestDeleteTasks, handleDuplicate, canEdit, undo, redo);

  const handleConvertToCloud = async () => {
    if (!isCloudAvailable) return;
    const result = await sbProject.uploadProject(
      projectTitle, teams, tasks,
      { viewStartDate: viewStartDateIso, weeksShown, density, unassignedGroupCollapsed }
    );
    if (!result) return;
    const { project, idMap } = result;

    // Remap local state to new UUIDs (suppress undo detection for ID remapping)
    suppressDetection();
    setTeams(prev => prev.map(t => ({
      ...t,
      id: idMap.get(t.id) || t.id,
      lanes: (t.lanes || []).map(l => ({ ...l, id: idMap.get(l.id) || l.id })),
    })));
    setTasks(prev => prev.map(t => ({
      ...t,
      id: idMap.get(t.id) || t.id,
      teamId: idMap.get(t.teamId) || t.teamId,
      laneId: idMap.get(t.laneId) || t.laneId,
    })));

    setProjectId(project.id);
    setCloudOwnerId(user.id);
    setStorageType('cloud');
    navigate(`/project/${project.id}`, { replace: true });
  };

  useViewGestures({ containerRef, setWeeksShown, shiftViewRef, maxWeeks });

  // ── Click outside handlers ────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) setShowColorPicker(false);
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(event.target)) setShowZoomMenu(false);
      if (!suppressClearRef.current && !(event.ctrlKey || event.metaKey)) {
        const clickedOnTask = event.target.closest?.('[data-task-id]');
        if (!clickedOnTask) setSelectedTaskIds([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // ── Window resize and editing trigger re-render ───────────────────────
  useEffect(() => {
    const handleResize = () => setTasks(prev => [...prev]);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Auto-expand collapsed teams on drag hover ─────────────────────────
  useEffect(() => {
    if (!dragState || !dragStartedRef.current || !hoverTarget || hoverTarget.teamId == null) return;
    const hoveredTeamId = hoverTarget.teamId;
    if (hoveredTeamId === 'null' || hoveredTeamId === null) {
      if (unassignedGroupCollapsed) setUnassignedGroupCollapsed(false);
    } else {
      const hoveredTeam = teams.find(t => t.id === hoveredTeamId);
      if (hoveredTeam?.collapsed) toggleCollapse(hoveredTeamId);
    }
  }, [hoverTarget, dragState]);

  // ── Rebase staging tasks on viewStartDate change ──────────────────────
  useEffect(() => {
    const swimlaneTeamIds = teams.filter(tm => tm.viewMode === 'swimlane').map(tm => tm.id);
    if (swimlaneTeamIds.length === 0) return;
    suppressDetection();
    setTasks(prev => {
      let changed = false;
      let next = [...prev];
      for (const teamId of swimlaneTeamIds) {
        const stagingTasks = getStagingTasks(next, teamId);
        if (stagingTasks.length === 0) continue;
        const compacted = compactStagingRow(stagingTasks, viewStartDateIso);
        const updateMap = new Map(compacted.map(c => [c.id, c.startDate]));
        next = next.map(tk => {
          if (updateMap.has(tk.id) && updateMap.get(tk.id) !== tk.startDate) { changed = true; return { ...tk, startDate: updateMap.get(tk.id) }; }
          return tk;
        });
      }
      return changed ? next : prev;
    });
  }, [viewStartDateIso, teams]);

  // ── Event handlers ────────────────────────────────────────────────────
  const handleCanvasMouseDown = (e) => {
    if (e.ctrlKey || e.metaKey || suppressClearRef.current) return;
    setSelectedTaskIds([]);
  };

  const handleToggleCollapse = (groupId) => {
    if (groupId === null) setUnassignedGroupCollapsed(prev => !prev);
    else toggleCollapse(groupId);
  };

  const handleMouseDownProxy = (e, task, type) => {
    if (!canEdit) return;
    if (type === 'move') { e.stopPropagation(); }
    else { e.preventDefault(); e.stopPropagation(); }
    dragHandleMouseDown(e, task, type, selectedTaskIds);
  };

  const handleResizeLeft = (e, task) => { if (!canEdit) return; e.stopPropagation(); dragHandleMouseDown(e, task, 'resize-left', selectedTaskIds); };
  const handleResizeRight = (e, task) => { if (!canEdit) return; e.stopPropagation(); dragHandleMouseDown(e, task, 'resize-right', selectedTaskIds); };

  const handleTouchDownProxy = (e, task, type) => {
    if (!canEdit) return;
    dragHandleTouchStart(e, task, type, selectedTaskIds);
  };
  const handleResizeTouchLeft = (e, task) => { if (!canEdit) return; dragHandleTouchStart(e, task, 'resize-left', selectedTaskIds); };
  const handleResizeTouchRight = (e, task) => { if (!canEdit) return; dragHandleTouchStart(e, task, 'resize-right', selectedTaskIds); };

  const handleAddTask = (title, teamId = null) => {
    if (!title.trim()) return;
    setEditingTaskId(addTask(title, viewStartDate, teamId));
  };

  const handleAddStagingTask = (title, teamId) => {
    if (!title.trim()) return;
    addStagingTask(title.trim(), teamId, viewStartDateIso);
  };

  const handleAddTeam = (name, viewMode = 'gantt') => {
    if (name?.trim()) addTeam(name.trim(), viewMode);
    setShowAddTeamModal(false);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetType === 'task') {
      deleteTaskWithCompact(deleteTargetId);
      setSelectedTaskIds(prev => prev.filter(id => id !== deleteTargetId));
    } else if (deleteTargetType === 'tasks') {
      const ids = Array.isArray(deleteTargetId) ? deleteTargetId : [deleteTargetId];
      ids.forEach(id => deleteTaskWithCompact(id));
      setSelectedTaskIds([]);
      setEditingTaskId(null);
    } else if (deleteTargetType === 'team') {
      deleteTeam(deleteTargetId);
    }
    cancelDelete();
  };

  // ── Export with optional history ──────────────────────────────────────
  const handleExportRequest = () => {
    if (history.length > 0) {
      setPendingHistoryAction('export');
    } else {
      exportProject();
    }
  };

  const handleHistoryDialogConfirm = (withHistory) => {
    const action = pendingHistoryAction;
    setPendingHistoryAction(null);
    if (action === 'export') {
      exportProject(withHistory ? history : undefined);
    } else if (action === 'newFile') {
      setIncludeHistoryInFile(withHistory);
    }
  };

  const selectedTask = tasks.find(t => t.id === editingTaskId);
  const groups = [...teams, { id: null, name: t('teams.unassigned'), collapsed: unassignedGroupCollapsed, viewMode: 'gantt' }];

  if (storageType === 'cloud' && !isCloudAvailable) {
    return (
      <main aria-live="polite" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900 p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('offline.cloudUnavailableTitle')}</h1>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{t('offline.cloudUnavailableMessage')}</p>
        <button onClick={() => navigate('/')} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          {t('offline.backToProjects')}
        </button>
      </main>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 p-6 font-sans text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden">
      <ProjectHeader
        projectTitle={projectTitle} isEditingTitle={isEditingTitle}
        onEditTitle={setIsEditingTitle} onSaveTitle={setProjectTitle}
        fileHandle={fileHandle} saveStatus={saveStatus} projectId={projectId}
        onHome={() => navigate('/')}
        onExport={handleExportRequest} onInfo={() => setShowInfoModal(true)} onHistory={() => {
          if (storageType === 'cloud' && sbProject) {
            sbProject.loadHistory(projectId).then(h => { setHistory(h || []); setShowHistoryModal(true); }).catch(() => setShowHistoryModal(true));
          } else {
            setShowHistoryModal(true);
          }
        }}
        storageType={storageType} user={user} profile={profile}
        isSupabaseConfigured={isSupabaseConfigured}
        isCloudAvailable={isCloudAvailable}
        onAuth={() => setShowAuthModal(true)}
        onShare={() => setShowShareModal(true)}
        onConvertToCloud={handleConvertToCloud}
        isAuthenticated={isAuthenticated}
        onSettings={() => navigate('/settings')}
        onSignOut={async () => { await signOut(); if (storageType === 'cloud') navigate('/', { replace: true }); }}
        activeUsers={activeUsers}
        canEdit={canEdit}
        isLoading={isProjectLoading}
        theme={theme}
        onThemeChange={onThemeChange}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        undoDepth={undoDepth}
      />

      <DeleteConfirmDialog show={showDeleteConfirm}
        onClose={cancelDelete} onConfirm={handleConfirmDelete}
        message={deleteTargetType === 'team' ? t('dialogs.delete.teamMessage')
          : deleteTargetType === 'tasks' ? t('dialogs.delete.tasksMessage', { count: Array.isArray(deleteTargetId) ? deleteTargetId.length : 1 })
          : t('dialogs.delete.taskMessage')} />

      <AddTeamModal show={showAddTeamModal} onClose={() => setShowAddTeamModal(false)} onSubmit={handleAddTeam} />

      <TeamDetailModal show={!!editingTeam} team={editingTeam}
        onClose={() => setEditingTeam(null)} onUpdate={updateTeam} />

      <TaskOverviewModal show={!!taskOverviewTeam} team={taskOverviewTeam} tasks={tasks}
        onClose={() => setTaskOverviewTeam(null)} onDeleteTask={(id) => { requestDeleteTask(id); }} />

      <div ref={splitContainerRef} className="flex-1 min-h-0 flex gap-3">
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col relative" style={{ minWidth: '50%' }}>
          <CalendarHeader
            monthHeaders={monthHeaders} weekData={weekData} monthBoundarySet={monthBoundarySet}
            onPrevWeek={() => shiftView(-1)} onToday={goToToday} onNextWeek={() => shiftView(1)}
            weeksShown={weeksShown} onWeeksChange={setWeeksShown} maxWeeks={maxWeeks}
            showZoomMenu={showZoomMenu} onToggleZoomMenu={setShowZoomMenu} zoomMenuRef={zoomMenuRef}
            scrollbarWidth={scrollbarWidth} currentWeekIdx={currentWeekIdx}
            density={density} onDensityChange={setDensity} />

          <div ref={containerRef} data-testid="calendar-grid" onMouseDown={handleCanvasMouseDown}
            aria-busy={isProjectLoading}
            className="relative flex-1 min-h-0 overflow-auto scroll-smooth">
            <div className="relative px-4 pt-2 pb-4 bg-grid dark:bg-slate-800 min-h-full">
              <div className="absolute top-0 bottom-0 left-4 right-4 flex pointer-events-none">
                {Array.from({ length: weeksShown }).map((_, i) => (
                  <div key={i} className={`flex-1 border-r last:border-r-0 ${monthBoundarySet.has(i) ? 'border-slate-200/60 dark:border-slate-700/60' : 'border-slate-100/50 dark:border-slate-700/30'} ${i === currentWeekIdx ? 'bg-slate-100/60 dark:bg-slate-700/40' : ''}`} />
                ))}
              </div>

              <TaskGrid
                groups={groups} tasks={tasks} teams={teams}
                viewStartDate={viewStartDate} dragState={dragState} dragStartedRef={dragStartedRef}
                dragPreview={dragPreview} hoverTarget={hoverTarget} getEffectiveTasks={getEffectiveTasks}
                containerWidth={containerWidth} selectedTaskIds={selectedTaskIds} weeksShown={weeksShown}
                onMouseDown={handleMouseDownProxy} onTouchStart={handleTouchDownProxy}
                onToggleCollapse={handleToggleCollapse}
                onDeleteTeam={requestDeleteTeam}
                onMoveTeamUp={moveTeamUp} onMoveTeamDown={moveTeamDown}
                onResizeLeft={handleResizeLeft} onResizeRight={handleResizeRight}
                onResizeTouchLeft={handleResizeTouchLeft} onResizeTouchRight={handleResizeTouchRight}
                onSelectTask={handleSelectTask} onSelectToggle={handleSelectToggle} onShiftSelect={handleShiftSelect} onTaskClick={handleTaskClick}
                onAddTask={handleAddTask} onAddStagingTask={handleAddStagingTask}
                onAddLane={addLane} onDeleteLane={deleteLane} onRenameLane={renameLane} onMoveLane={moveLane}
                onEditTeam={(group) => setEditingTeam(group)}
                onShowTaskOverview={(group) => setTaskOverviewTeam(group)}
                weekData={weekData} rowHeight={rowHeight} rowGap={rowGap}
                canEdit={canEdit} />
            </div>
          </div>

          {isProjectLoading && (
            <div data-testid="project-loading" role="status" className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 dark:bg-slate-800/60 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md text-sm font-medium text-slate-600 dark:text-slate-300">
                <Loader2 size={16} className="animate-spin text-blue-500" aria-hidden="true" />
                {t('project.loading')}
              </div>
            </div>
          )}

          {canEdit && (
            <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 shrink-0">
              <button data-testid="add-team-btn" onClick={() => setShowAddTeamModal(true)}
                className="w-full h-9 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition-colors text-xs font-medium">
                <Plus size={14} /> {t('teams.actions.newTeam')}
              </button>
            </div>
          )}
        </div>

        {selectedTask && (
          containerWidth > 0 && containerWidth < 640 ? (
            <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-black/40" onClick={() => setEditingTaskId(null)} />
              <div className="absolute inset-x-0 bottom-0 top-16 flex flex-col animate-in slide-in-from-bottom-4 duration-200">
                <TaskDetailsPanel task={selectedTask} teams={teams} onUpdate={(id, updates) => { updateTask(id, updates); if ('notes' in updates) setTimeout(flushPending, 0); }}
                  onDelete={requestDeleteTask} onClose={() => setEditingTaskId(null)}
                  showColorPicker={showColorPicker} onToggleColorPicker={setShowColorPicker} colorPickerRef={colorPickerRef}
                  width={undefined} canEdit={canEdit} />
              </div>
            </div>
          ) : (
            <>
              <div
                ref={splitDividerRef}
                data-testid="split-divider"
                className="shrink-0 cursor-col-resize self-stretch flex items-center justify-center w-4 -mx-1"
              >
                <GripVertical size={14} className="text-slate-300 dark:text-slate-600 hover:text-blue-400 transition-colors" />
              </div>
              <TaskDetailsPanel task={selectedTask} teams={teams} onUpdate={(id, updates) => { updateTask(id, updates); if ('notes' in updates) setTimeout(flushPending, 0); }}
                onDelete={requestDeleteTask} onClose={() => setEditingTaskId(null)}
                showColorPicker={showColorPicker} onToggleColorPicker={setShowColorPicker} colorPickerRef={colorPickerRef}
                width={detailsPanelWidth} canEdit={canEdit} />
            </>
          )
        )}
      </div>

      <InfoModal show={showInfoModal} onClose={() => setShowInfoModal(false)} version={version} packageName={packageName} />
      <HistoryModal show={showHistoryModal} onClose={() => setShowHistoryModal(false)} history={history} storageType={storageType} onRestoreTo={restoreToEntry} canRestoreTo={canRestoreEntry} />
      <IncludeHistoryDialog show={!!pendingHistoryAction} onClose={() => setPendingHistoryAction(null)} onConfirm={handleHistoryDialogConfirm} />

      <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)}
        user={user} profile={profile} mfaRequired={mfaRequired} passwordRecovery={passwordRecovery}
        onCheckEmail={checkEmailExists} onSignIn={signInWithPassword} onSignUp={signUp}
        onSignOut={async () => { await signOut(); if (storageType === 'cloud') navigate('/', { replace: true }); }}
        onResetPassword={resetPasswordForEmail} onUpdatePassword={updatePassword}
        onUpdateProfile={updateProfile}
        onGetMfaFactors={getMfaFactors} onVerifyMfa={verifyMfa}
      />

      <ShareProjectModal show={showShareModal} onClose={() => setShowShareModal(false)}
        projectId={projectId} ownerId={cloudOwnerId} currentUserId={user?.id}
        onGetOwnerProfile={sbProject.getProfileById}
        onGetMembers={sbProject.getMembers} onInvite={sbProject.inviteMember} onRemoveMember={sbProject.removeMember}
        onUpdateMemberRole={sbProject.updateMemberRole} onTransferOwnership={sbProject.transferOwnership}
        onGetPendingInvites={sbProject.getPendingInvites} onRemovePendingInvite={sbProject.removePendingInvite}
        onUpdatePendingInviteRole={sbProject.updatePendingInviteRole} onResendInvite={sbProject.resendInvite} />
    </div>
  );
};

export default App;
