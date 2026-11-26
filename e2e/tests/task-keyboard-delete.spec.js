import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Helpers (file-local) -----------------------------------------------------

async function addTask(page, title) {
  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', title);
  await page.keyboard.press('Enter');
}

// -- Tests --------------------------------------------------------------------

test('should_delete_task_when_delete_pressed_and_confirmed', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Delete Me');
  await page.waitForSelector('[data-task-id]');

  const task = page.locator('[data-task-id]').first();
  await task.click();
  await expect(task).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Delete');

  await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
  await page.click('[data-testid="confirm-delete-btn"]');

  await expect(page.locator('[data-task-id]')).toHaveCount(0);
});

test('should_delete_multiple_tasks_when_bulk_delete_confirmed', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Bulk A');
  await addTask(page, 'Bulk B');
  await page.waitForSelector('[data-task-id]');

  const tasks = page.locator('[data-task-id]');
  expect(await tasks.count()).toBe(2);

  // Select both with Ctrl+Click
  await page.keyboard.down('Control');
  await tasks.nth(0).click();
  await tasks.nth(1).click();
  await page.keyboard.up('Control');

  await page.keyboard.press('Delete');

  await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
  await page.click('[data-testid="confirm-delete-btn"]');

  await expect(page.locator('[data-task-id]')).toHaveCount(0);
});

test('should_allow_recreating_task_with_same_title_after_deletion', async ({ page }) => {
  await setupProject(page);
  const title = 'Delete and Recreate';

  // Create and delete
  await addTask(page, title);
  await page.waitForSelector('[data-task-id]');
  await page.locator('[data-task-id]').first().click();
  await expect(page.locator('[data-testid="details-panel-header"]')).toBeVisible();
  await page.click('[data-testid="delete-task-btn"]');
  await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
  await page.click('[data-testid="confirm-delete-btn"]');
  await expect(page.locator('[data-testid="confirm-modal"]')).toHaveCount(0);

  // Recreate with same title
  await addTask(page, title);
  await page.waitForSelector('[data-task-id]');

  await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();
});
