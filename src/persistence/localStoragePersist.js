import { saveProjectToLS } from '../utils/localStorage';
import { saveHistory } from '../utils/historyDB';

const DEBOUNCE_MS = 500;

export const createLocalStorageAdapter = () => {
  let timer = null;
  let latestState = null;

  const writeNow = () => {
    if (!latestState) return;
    const { projectId, projectTitle, tasks, teams, unassignedGroupCollapsed, viewStartDate, weeksShown, density, history } = latestState;
    saveProjectToLS(projectId, projectTitle, tasks, teams, { unassignedGroupCollapsed, viewStartDate, weeksShown, density });
    if (projectId && history) {
      saveHistory(projectId, history).catch(() => {});
    }
  };

  return {
    save(state) {
      latestState = state;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { writeNow(); timer = null; }, DEBOUNCE_MS);
    },
    flush() {
      if (timer) { clearTimeout(timer); timer = null; writeNow(); }
    },
    destroy() {
      if (timer) { clearTimeout(timer); timer = null; }
    },
  };
};
