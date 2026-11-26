import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Tests --------------------------------------------------------------------

test('should_persist_project_data_to_localStorage', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="project-title"]');
  await page.fill('[data-testid="project-title-input"]', 'Backup Test Title');
  await page.keyboard.press('Enter');

  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', 'Team Alpha');
  await page.keyboard.press('Enter');

  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Backup Task 1');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');

  await page.waitForFunction(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('planner_project_'));
    if (!key) return false;
    return JSON.parse(localStorage.getItem(key)).title === 'Backup Test Title';
  }, { timeout: 5000 });

  const project = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('planner_project_'));
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  });

  expect(project).toBeTruthy();
  expect(project.title).toBe('Backup Test Title');
  expect(project.tasks.length).toBeGreaterThanOrEqual(1);
  expect(project.teams.length).toBeGreaterThanOrEqual(1);
});

test('should_reassign_orphaned_tasks_to_unassigned_group', async ({ page }) => {
  await page.goto('/');

  const projectData = {
    id: 'orphan-test-id',
    title: 'Orphan Test',
    viewStartDate: new Date().toISOString(),
    weeksShown: 12,
    teams: [{ id: 'team-real', name: 'Real Team', collapsed: false }],
    tasks: [
      { id: 'task-valid', title: 'Valid Task', teamId: 'team-real', row: 0, col: 0, duration: 2, color: 'blue', startDate: new Date().toISOString(), position: 0 },
      { id: 'task-orphan', title: 'Orphan Task', teamId: 'team-gone', row: 1, col: 0, duration: 2, color: 'rose', startDate: new Date().toISOString(), position: 0 },
      { id: 'task-noteam', title: 'No Team Task', teamId: null, row: 2, col: 0, duration: 2, color: 'emerald', startDate: new Date().toISOString(), position: 0 },
    ],
  };

  await page.evaluate((data) => {
    localStorage.setItem(`planner_project_${data.id}`, JSON.stringify(data));
    localStorage.setItem('planner_projects_list', JSON.stringify([{ id: data.id, title: data.title, lastModified: new Date().toISOString() }]));
    localStorage.setItem('planner_last_project_id', data.id);
  }, projectData);

  await page.goto('/project/orphan-test-id');
  await page.waitForSelector('[data-task-id]');

  await expect(page.locator('[data-task-id="task-valid"]')).toBeVisible();
  await expect(page.locator('[data-task-id="task-orphan"]')).toBeVisible();
  await expect(page.locator('[data-task-id="task-noteam"]')).toBeVisible();

  const unassigned = page.locator('[data-team-id="null"]');
  await expect(unassigned.locator('[data-task-id="task-orphan"]')).toBeVisible();
  await expect(unassigned.locator('[data-task-id="task-noteam"]')).toBeVisible();
});

test('should_persist_calendar_position_after_reload', async ({ page }) => {
  await setupProject(page);

  const initialHeaders = await page.locator('[data-testid="calendar-header"]').textContent();

  await page.click('[data-testid="next-week-btn"]');
  await page.click('[data-testid="next-week-btn"]');

  const shiftedHeaders = await page.locator('[data-testid="calendar-header"]').textContent();
  expect(shiftedHeaders).not.toBe(initialHeaders);

  // Verify ISO date is stored
  await page.waitForFunction(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('planner_project_'));
    if (!key) return false;
    return !!JSON.parse(localStorage.getItem(key)).viewStartDate;
  }, { timeout: 5000 });

  await page.reload();
  await page.waitForSelector('[data-testid="calendar-header"]');

  const headersAfter = await page.locator('[data-testid="calendar-header"]').textContent();
  expect(headersAfter).toBe(shiftedHeaders);
});

test('should_persist_weeks_shown_after_reload', async ({ page }) => {
  await setupProject(page);

  const zoomBtn = page.locator('[data-testid="zoom-btn"]');
  await expect(zoomBtn).toContainText('12');

  await zoomBtn.click();
  await page.locator('[data-testid="zoom-option-8"]').click();
  await expect(zoomBtn).toContainText('8');

  await page.waitForFunction(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('planner_project_'));
    if (!key) return false;
    return JSON.parse(localStorage.getItem(key)).weeksShown === 8;
  }, { timeout: 5000 });

  await page.reload();
  await page.waitForSelector('[data-testid="zoom-btn"]');

  await expect(page.locator('[data-testid="zoom-btn"]')).toContainText('8');
});

test('should_persist_swimlane_viewMode_after_reload', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', 'Persist Team');
  await page.click('[data-testid="viewmode-swimlane"]');
  await page.click('[data-testid="add-team-submit"]');

  await page.waitForFunction(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('planner_project_'));
    if (!key) return false;
    return JSON.parse(localStorage.getItem(key)).teams?.some(t => t.viewMode === 'swimlane');
  }, { timeout: 5000 });

  await page.reload();
  await page.waitForSelector('[data-team-id]');

  await expect(page.locator('[data-team-id]').filter({ hasText: 'Persist Team' })).toBeVisible();
});
