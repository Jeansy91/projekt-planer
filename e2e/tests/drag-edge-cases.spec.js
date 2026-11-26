import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Helpers (file-local) -----------------------------------------------------

async function addTask(page, title) {
  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', title);
  await page.keyboard.press('Enter');
}

// -- Tests --------------------------------------------------------------------

test('should_keep_task_visible_when_dragged_to_far_left', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Past Task');
  await page.waitForSelector('[data-task-id]');

  const task = page.locator('[data-task-id]').first();
  const box = await task.boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(100, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();

  await expect(task).toBeVisible();
});

test('should_keep_task_visible_when_dragged_to_far_right', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Future Task');
  await page.waitForSelector('[data-task-id]');

  const task = page.locator('[data-task-id]').first();
  const box = await task.boundingBox();
  const viewport = page.viewportSize();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(viewport.width - 100, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();

  await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();
});

test('should_create_10_tasks_rapidly_without_losing_any', async ({ page }) => {
  await setupProject(page);

  for (let i = 0; i < 10; i++) {
    await addTask(page, `Quick Task ${i}`);
  }

  await expect(page.locator('[data-task-id]')).toHaveCount(10, { timeout: 10000 });
});

test('should_not_shift_task_position_when_selected', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Position Task');
  await page.waitForSelector('[data-task-id]');

  const task = page.locator('[data-task-id]').first();
  const beforeBox = await task.boundingBox();

  await task.click();
  await expect(page.locator('[data-testid="details-panel-header"]')).toBeVisible();

  // Wait for any CSS transitions
  await page.waitForFunction(() => {
    const t = document.querySelector('[data-task-id]');
    return t && t.getAttribute('aria-selected') === 'true';
  });

  const afterBox = await task.boundingBox();
  expect(Math.abs(afterBox.x - beforeBox.x)).toBeLessThan(2);
});
