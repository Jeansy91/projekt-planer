const LS_PREFIX = 'planner_project_';
const LS_LIST_KEY = 'planner_projects_list';

export const saveProjectToLS = (id, title, tasks, teams, { unassignedGroupCollapsed = false, viewStartDate = null, weeksShown = 12, density = 0 } = {}) => {
  localStorage.setItem(
    `${LS_PREFIX}${id}`,
    JSON.stringify({ id, title, tasks, teams, unassignedGroupCollapsed, viewStartDate, weeksShown, density })
  );

  const list = JSON.parse(localStorage.getItem(LS_LIST_KEY) || '[]');
  const idx = list.findIndex(p => p.id === id);
  const entry = { id, title, lastModified: new Date().toISOString() };
  if (idx > -1) list[idx] = entry;
  else list.push(entry);
  localStorage.setItem(LS_LIST_KEY, JSON.stringify(list));
};

export const loadProjectFromLS = (id) => {
  const raw = localStorage.getItem(`${LS_PREFIX}${id}`);
  return raw ? JSON.parse(raw) : null;
};

export const loadProjectList = () =>
  JSON.parse(localStorage.getItem(LS_LIST_KEY) || '[]');

export const deleteProjectFromLS = (projectId) => {
  const list = loadProjectList().filter(p => p.id !== projectId);
  localStorage.removeItem(`${LS_PREFIX}${projectId}`);
  localStorage.setItem(LS_LIST_KEY, JSON.stringify(list));
  return list;
};
