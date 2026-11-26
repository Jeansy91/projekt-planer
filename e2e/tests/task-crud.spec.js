import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Helpers (file-local, DAMP) -----------------------------------------------

async function addTask(page, title, teamId = 'null') {
  await page.click(`[data-testid="add-task-${teamId}"]`);
  await page.fill('[data-testid="task-name-input"]', title);
  await page.keyboard.press('Enter');
}

// -- Tests --------------------------------------------------------------------

test('should_create_task_when_title_entered', async ({ page }) => {
  await setupProject(page);

  await addTask(page, 'My New Task');

  await page.waitForSelector('[data-task-id]');
  const titleSpan = page.locator('[data-task-id]').first().locator('span').first();
  await expect(titleSpan).toContainText('My New Task');
});

test('should_create_multiple_tasks_when_added_sequentially', async ({ page }) => {
  await setupProject(page);

  const titles = ['Task One', 'Task Two', 'Task Three'];
  for (const title of titles) await addTask(page, title);

  await page.waitForSelector('[data-task-id]');
  const taskElements = page.locator('[data-task-id]');
  await expect(taskElements).toHaveCount(3);

  for (const title of titles) {
    await expect(page.locator(`text="${title}"`)).toBeVisible();
  }
});

test('should_not_create_task_when_title_is_empty', async ({ page }) => {
  await setupProject(page);

  const initialCount = await page.locator('[data-task-id]').count();

  await page.click('[data-testid="add-task-null"]');
  await page.keyboard.press('Enter');

  const finalCount = await page.locator('[data-task-id]').count();
  expect(finalCount).toBe(initialCount);
});

test('should_create_task_when_title_has_special_characters', async ({ page }) => {
  await setupProject(page);

  const specialTitle = 'Task with <>&"\'@#$%^*()_+-=[]{}|;:,.<>?/~`';
  await addTask(page, specialTitle);

  await page.waitForSelector('[data-task-id]');
  const task = page.locator('[data-task-id]').first();
  await expect(task).toBeVisible();

  await task.click();
  await expect(page.locator('[data-testid="details-panel-header"]')).toBeVisible();
  await expect(page.locator('body')).toContainText('Task with');
});

test('should_create_task_when_title_has_emoji', async ({ page }) => {
  await setupProject(page);

  await addTask(page, '🚀 Launch Project 🎉');

  await page.waitForSelector('[data-task-id]');
  const task = page.locator('[data-task-id]').first();
  await expect(task).toContainText('🚀');
});

test('should_reset_task_input_when_clicking_outside', async ({ page }) => {
  // Arrange
  await setupProject(page);
  const initialCount = await page.locator('[data-task-id]').count();

  // Act
  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Should Not Be Created');
  await page.click('body', { position: { x: 10, y: 10 } });

  // Assert
  await expect(page.locator('[data-testid="task-name-input"]')).toHaveCount(0);
  const finalCount = await page.locator('[data-task-id]').count();
  expect(finalCount).toBe(initialCount);
});

test('should_display_task_when_title_is_very_long', async ({ page }) => {
  await setupProject(page);

  await addTask(page, 'A'.repeat(500));

  await page.waitForSelector('[data-task-id]');
  const task = page.locator('[data-task-id]').first();
  await expect(task).toBeVisible();

  const box = await task.boundingBox();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
});
