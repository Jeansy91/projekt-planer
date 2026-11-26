/** All tasks belonging to a team (including unassigned when teamId is null). */
export const getTeamTasks = (tasks, teamId) =>
  tasks.filter(t => teamId === null ? !t.teamId : t.teamId === teamId);

// Lane Tasks selected together must be adjacent (sorted by startDate). Used by
// multi-select inside swimlane Lanes to refuse a gap-inducing toggle: returning
// false tells the caller to collapse selection to just the clicked Task.
export const isLaneSelectionAdjacent = (selectedIds, clickedTask, allTasks) => {
  if (!clickedTask?.laneId || selectedIds.length <= 1) return true;
  const laneTasks = allTasks
    .filter(t => t.laneId === clickedTask.laneId)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const selectedInLane = laneTasks.filter(t => selectedIds.includes(t.id));
  if (selectedInLane.length <= 1) return true;
  const indices = selectedInLane.map(t => laneTasks.findIndex(lt => lt.id === t.id));
  const span = Math.max(...indices) - Math.min(...indices) + 1;
  return span === selectedInLane.length;
};
