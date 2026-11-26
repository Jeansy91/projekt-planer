// Staging utils — operations on the **Staging** row (positional row above the Gantt
// grid, per team). See docs/glossary.md → "Staging".

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Tasks in a team's staging row (no lane assigned), sorted by startDate ascending. */
export const getStagingTasks = (tasks, teamId) =>
  tasks
    .filter(t => t.teamId === teamId && !t.laneId)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

/**
 * Compact staging row tasks: pack them contiguously starting at anchorDate.
 * @param {Array} stagingTasks - tasks sorted by startDate (ascending)
 * @param {Date|string} anchorDate - leftmost position (viewStartDate)
 * @returns {Array} tasks with recomputed startDate values
 */
export const compactStagingRow = (stagingTasks, anchorDate) => {
  if (!stagingTasks || stagingTasks.length === 0) return [];
  let cursor = new Date(anchorDate).getTime();
  return stagingTasks.map(task => {
    const startDate = new Date(cursor).toISOString();
    cursor += task.duration * MS_PER_WEEK;
    return { ...task, startDate };
  });
};
