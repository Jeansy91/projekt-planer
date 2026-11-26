/**
 * Seeds localStorage with a blank project and navigates to the project view.
 * Shared across all E2E spec files.
 */
export const setupProject = async (page) => {
  const id = 'e2e-test';
  await page.goto('/');
  await page.evaluate((pid) => {
    const data = { id: pid, title: 'Test Project', teams: [], tasks: [], viewStartDate: new Date().toISOString(), weeksShown: 12 };
    localStorage.setItem('planner_project_' + pid, JSON.stringify(data));
    localStorage.setItem('planner_projects_list', JSON.stringify([{ id: pid, title: 'Test Project', lastModified: new Date().toISOString() }]));
  }, id);
  await page.goto('/project/' + id);
  await page.waitForSelector('[data-testid="add-task-null"]');
};
