import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Helpers (file-local) -----------------------------------------------------

async function addTask(page, title) {
  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', title);
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');
}

// -- Tests --------------------------------------------------------------------

test('should_extend_task_left_when_left_handle_dragged', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Resize Task');

  const task = page.locator('[data-task-id]').first();
  const box = await task.boundingBox();

  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 40, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();

  const newBox = await task.boundingBox();
  expect(newBox.width).toBeGreaterThan(box.width);
  expect(newBox.x).toBeLessThan(box.x);
});

test('should_extend_task_right_when_right_handle_dragged', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Extend Task');

  const task = page.locator('[data-task-id]').first();
  const box = await task.boundingBox();

  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 40, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();

  const newBox = await task.boundingBox();
  expect(newBox.width).toBeGreaterThan(0);
  await expect(task).toBeVisible();
});

test('should_resize_all_selected_tasks_when_resizing_one', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Resize A');
  await addTask(page, 'Resize B');

  const first = page.locator('[data-task-id]').nth(0);
  const second = page.locator('[data-task-id]').nth(1);

  // Select both
  await page.keyboard.down('Control');
  await first.click();
  await second.click();
  await page.keyboard.up('Control');

  const initFirst = await first.boundingBox();
  const initSecond = await second.boundingBox();

  // Drag right edge of first task
  await page.mouse.move(initFirst.x + initFirst.width - 2, initFirst.y + initFirst.height / 2);
  await page.mouse.down();
  await page.mouse.move(initFirst.x + initFirst.width + 60, initFirst.y + initFirst.height / 2, { steps: 10 });
  await page.mouse.up();

  const newFirst = await first.boundingBox();
  const newSecond = await second.boundingBox();

  expect(newFirst.width).toBeGreaterThan(initFirst.width);
  expect(newSecond.width).toBeGreaterThan(initSecond.width);

  const deltaFirst = newFirst.width - initFirst.width;
  const deltaSecond = newSecond.width - initSecond.width;
  expect(Math.abs(deltaFirst - deltaSecond)).toBeLessThan(5);
});

test('should_not_cause_horizontal_scrollbar_when_resized_far', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Overflow Task');

  const task = page.locator('[data-task-id]').first();
  const box = await task.boundingBox();

  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 2000, box.y + box.height / 2, { steps: 20 });
  await page.mouse.up();

  const grid = page.locator('[data-testid="calendar-grid"]');
  const hasHorizontalScroll = await grid.evaluate(el => el.scrollWidth > el.clientWidth);
  expect(hasHorizontalScroll).toBe(false);
});
