// Pure geometry for placing Task bars on the calendar grid. Used by TaskGrid
// (Gantt rows) and SwimlaneView (lane rows + staging row). Keeps pixel math
// in one place so a future view (timeline, calendar) reuses it instead of
// forking yet another `(taskDate - viewStartDate) / msPerWeek` calculation.

export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// Outer container width minus horizontal padding (px-4 = 32px total).
// Falls back to 1000 before the ResizeObserver has measured anything.
export const gridInnerWidth = (containerWidth) =>
  containerWidth > 0 ? containerWidth - 32 : 1000;

// Pixel box of a Task given the current view window. `viewStartDate` is a
// Date or a ms-timestamp. Returns `{leftPx, widthPx}`. Callers decide what
// to do with off-screen boxes (Gantt renders a peek of the off-screen title;
// Swimlane drops them).
export const taskBoxPx = ({ task, viewStartDate, weeksShown, innerWidth }) => {
  const startMs = new Date(task.startDate).getTime();
  const viewMs = typeof viewStartDate === 'number' ? viewStartDate : new Date(viewStartDate).getTime();
  const leftPx = ((startMs - viewMs) / MS_PER_WEEK / weeksShown) * innerWidth;
  const widthPx = (task.duration / weeksShown) * innerWidth;
  return { leftPx, widthPx };
};

// Convenience: true when the box is entirely off-screen to the left or right.
export const isTaskBoxOffScreen = ({ leftPx, widthPx }, innerWidth) =>
  leftPx > innerWidth || leftPx + widthPx < 0;
