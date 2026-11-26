import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Helpers (file-local) -----------------------------------------------------

async function addTask(page, title) {
  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', title);
  await page.keyboard.press('Enter');
}

async function addTasks(page, titles) {
  for (const title of titles) await addTask(page, title);
  await page.waitForSelector('[data-task-id]');
}

// -- Tests --------------------------------------------------------------------

test('should_duplicate_task_when_ctrl_d_pressed', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTasks(page, ['Original Task']);
  const task = page.locator('[data-task-id]').first();
  await task.click();
  await page.waitForSelector('[data-testid="details-panel-header"]');

  // Act
  await page.keyboard.press('Control+d');
  await page.waitForFunction(() => document.querySelectorAll('[data-task-id]').length === 2);

  // Assert
  const tasks = page.locator('[data-task-id]');
  await expect(tasks).toHaveCount(2);
});

test('should_duplicate_multiple_tasks_when_ctrl_d_pressed_with_multiselect', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTasks(page, ['Task A', 'Task B']);
  await page.locator('[data-task-id]').first().click();
  await page.keyboard.press('Control+a');

  // Act
  await page.keyboard.press('Control+d');
  await page.waitForFunction(() => document.querySelectorAll('[data-task-id]').length === 4);

  // Assert
  const tasks = page.locator('[data-task-id]');
  await expect(tasks).toHaveCount(4);
});

test('should_select_duplicated_tasks_after_ctrl_d', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTasks(page, ['Select Test']);
  const task = page.locator('[data-task-id]').first();
  await task.click();
  await page.waitForSelector('[data-testid="details-panel-header"]');

  // Act
  await page.keyboard.press('Control+d');
  await page.waitForFunction(() => document.querySelectorAll('[data-task-id]').length === 2);

  // Assert - the duplicated task should be selected (details panel open)
  await expect(page.locator('[data-testid="details-panel-header"]')).toBeVisible();
});

test('should_duplicate_swimlane_task_into_staging_row', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', 'Swim Team');
  await page.click('[data-testid="viewmode-swimlane"]');
  await page.click('[data-testid="add-team-submit"]');
  const teamDiv = page.locator('[data-team-id]').filter({ hasText: 'Swim Team' });
  const teamId = await teamDiv.getAttribute('data-team-id');
  await page.click(`[data-testid="add-lane-${teamId}"]`);
  await page.fill('[data-testid="lane-name-input"]', 'Dev Lane');
  await page.keyboard.press('Enter');
  await page.click(`[data-testid="add-task-${teamId}"]`);
  await page.fill('[data-testid="task-name-input"]', 'Lane Task');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');

  // Drag task into lane
  const task = teamDiv.locator('[data-task-id]').first();
  const lane = teamDiv.locator('[data-lane-id]').first();
  await task.dragTo(lane);

  // Select task and duplicate
  await teamDiv.locator('[data-task-id]').first().click();
  await page.waitForSelector('[data-testid="details-panel-header"]');

  // Act
  await page.keyboard.press('Control+d');
  await page.waitForFunction(() => document.querySelectorAll('[data-task-id]').length === 2);

  // Assert - should have 2 tasks total
  await expect(teamDiv.locator('[data-task-id]')).toHaveCount(2);
});

test('should_not_duplicate_when_no_task_selected', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTasks(page, ['Lonely Task']);
  // Click on empty area to deselect
  await page.locator('[data-testid="calendar-grid"]').click();

  // Act
  await page.keyboard.press('Control+d');

  // Assert - still only one task
  const tasks = page.locator('[data-task-id]');
  await expect(tasks).toHaveCount(1);
});
