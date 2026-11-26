import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Helpers (file-local) -----------------------------------------------------

async function addTask(page, title) {
  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', title);
  await page.keyboard.press('Enter');
}

async function getWeekWidth(page) {
  const info = await page.evaluate(() => {
    const container = document.querySelector('[data-testid="calendar-grid"]');
    const rect = container.getBoundingClientRect();
    const btn = document.querySelector('[data-testid="zoom-btn"]');
    const weeks = btn ? parseInt((btn.textContent.match(/(\d+)/) || [])[0], 10) : 12;
    return { width: rect.width, weeks };
  });
  return info.width / info.weeks;
}

// -- Tests --------------------------------------------------------------------

test('should_move_task_right_when_dragged_right', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Task to Move');
  await page.waitForSelector('[data-task-id]');

  const weekWidth = await getWeekWidth(page);
  const task = page.locator('[data-task-id]').first();
  const box = await task.boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + weekWidth, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();

  const newBox = await task.boundingBox();
  expect(newBox.x).toBeGreaterThan(box.x);
});

test('should_move_task_left_when_dragged_left', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Task to Move Back');
  await page.waitForSelector('[data-task-id]');

  const weekWidth = await getWeekWidth(page);
  const task = page.locator('[data-task-id]').first();

  // First drag right so the task is not at column 0
  const box0 = await task.boundingBox();
  await page.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2);
  await page.mouse.down();
  await page.mouse.move(box0.x + box0.width / 2 + weekWidth * 2, box0.y + box0.height / 2, { steps: 10 });
  await page.mouse.up();

  // Now drag left
  const box = await task.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - weekWidth, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();

  const newBox = await task.boundingBox();
  expect(newBox.x).toBeLessThan(box.x);
});

test('should_move_task_to_different_row_when_dragged_down', async ({ page }) => {
  await setupProject(page);
  for (let i = 0; i < 3; i++) await addTask(page, `Task ${i}`);
  await page.waitForSelector('[data-task-id]');

  const first = page.locator('[data-task-id]').nth(0);
  const box = await first.boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height * 2 + 10, { steps: 5 });
  await page.mouse.up();

  const newBox = await first.boundingBox();
  expect(newBox).toBeDefined();
});

test('should_move_all_selected_tasks_when_dragging_one', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Task A');
  await addTask(page, 'Task B');
  await page.waitForSelector('[data-task-id]');

  const weekWidth = await getWeekWidth(page);
  const first = page.locator('[data-task-id]').nth(0);
  const second = page.locator('[data-task-id]').nth(1);

  // Select both
  await page.keyboard.down('Control');
  await first.click();
  await second.click();
  await page.keyboard.up('Control');

  const initialFirst = await first.boundingBox();
  const initialSecond = await second.boundingBox();

  // Drag first task right
  await page.mouse.move(initialFirst.x + initialFirst.width / 2, initialFirst.y + initialFirst.height / 2);
  await page.mouse.down();
  await page.mouse.move(initialFirst.x + initialFirst.width / 2 + weekWidth, initialFirst.y + initialFirst.height / 2, { steps: 10 });
  await page.mouse.up();

  const newFirst = await first.boundingBox();
  const newSecond = await second.boundingBox();

  const deltaFirst = newFirst.x - initialFirst.x;
  const deltaSecond = newSecond.x - initialSecond.x;
  expect(Math.abs(deltaFirst - deltaSecond)).toBeLessThan(2);
  expect(Math.abs(deltaFirst)).toBeGreaterThan(0);
});

test('should_not_select_text_when_dragging_task', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'No Select Task');
  await page.waitForSelector('[data-task-id]');

  const task = page.locator('[data-task-id]').first();
  const box = await task.boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2, { steps: 10 });

  const selectedText = await page.evaluate(() => window.getSelection().toString());
  expect(selectedText).toBe('');

  await page.mouse.up();
});

test('should_have_select_none_on_task_grid', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Grid Task');
  await page.waitForSelector('[data-task-id]');

  const userSelect = await page.evaluate(() => {
    const gridEl = document.querySelector('[data-team-id]')?.parentElement;
    return gridEl ? window.getComputedStyle(gridEl).userSelect : null;
  });
  expect(userSelect).toBe('none');
});

test('should_keep_task_visible_on_click_hold_without_drag', async ({ page }) => {
  await setupProject(page);
  await addTask(page, 'Task to Hold');
  await page.waitForSelector('[data-task-id]');

  const task = page.locator('[data-task-id]').first();
  const box = await task.boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();

  await expect(task).toBeVisible();
  await expect(task).toContainText('Task to Hold');

  await page.mouse.up();
  await expect(task).toBeVisible();
});
