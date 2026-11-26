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

function isSelected(locator) {
  return locator.evaluate(el => el.classList.contains('outline-2'));
}

// -- Tests --------------------------------------------------------------------

test('should_select_task_and_open_details_when_clicked', async ({ page }) => {
  await setupProject(page);
  await addTasks(page, ['Single Task']);

  const task = page.locator('[data-task-id]').first();
  await task.click();

  await expect(page.locator('[data-testid="details-panel-header"]')).toBeVisible();
});

test('should_toggle_selection_when_ctrl_clicked', async ({ page }) => {
  await setupProject(page);
  await addTasks(page, ['Toggle Task']);

  const task = page.locator('[data-task-id]').first();

  // Ctrl+Click → select
  await page.keyboard.down('Control');
  await task.click();
  await page.keyboard.up('Control');
  expect(await isSelected(task)).toBe(true);

  // Ctrl+Click again → deselect
  await page.keyboard.down('Control');
  await task.click();
  await page.keyboard.up('Control');
  expect(await isSelected(task)).toBe(false);
});

test('should_deselect_others_when_clicking_unselected_task', async ({ page }) => {
  await setupProject(page);
  await addTasks(page, ['Task A', 'Task B', 'Task C']);

  const tasks = page.locator('[data-task-id]');

  // Select first two with Ctrl
  await page.keyboard.down('Control');
  await tasks.nth(0).click();
  await tasks.nth(1).click();
  await page.keyboard.up('Control');
  expect(await isSelected(tasks.nth(0))).toBe(true);
  expect(await isSelected(tasks.nth(1))).toBe(true);

  // Click third without Ctrl → deselects others
  await tasks.nth(2).click();
  expect(await isSelected(tasks.nth(0))).toBe(false);
  expect(await isSelected(tasks.nth(1))).toBe(false);
  expect(await isSelected(tasks.nth(2))).toBe(true);
});

test('should_not_move_tasks_when_ctrl_clicking', async ({ page }) => {
  await setupProject(page);
  await addTasks(page, ['Task A', 'Task B', 'Task C']);

  const initialPositions = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-task-id]')).map(el => ({
      id: el.getAttribute('data-task-id'),
      left: el.style.left,
      top: el.style.top,
    }));
  });

  await page.keyboard.down('Control');
  await page.locator('[data-task-id]').nth(0).click();
  await page.locator('[data-task-id]').nth(2).click();
  await page.keyboard.up('Control');

  const positionsAfter = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-task-id]')).map(el => ({
      id: el.getAttribute('data-task-id'),
      left: el.style.left,
      top: el.style.top,
    }));
  });

  expect(positionsAfter).toEqual(initialPositions);
});

test('should_select_range_when_shift_clicked', async ({ page }) => {
  await setupProject(page);
  await addTasks(page, ['Range A', 'Range B', 'Range C', 'Range D']);

  const tasks = page.locator('[data-task-id]');

  // Click first (anchor)
  await tasks.nth(0).click();

  // Shift+click third → selects 0, 1, 2
  await page.keyboard.down('Shift');
  await tasks.nth(2).click();
  await page.keyboard.up('Shift');

  expect(await isSelected(tasks.nth(0))).toBe(true);
  expect(await isSelected(tasks.nth(1))).toBe(true);
  expect(await isSelected(tasks.nth(2))).toBe(true);
  expect(await isSelected(tasks.nth(3))).toBe(false);
});

test('should_add_range_to_selection_when_ctrl_shift_clicked', async ({ page }) => {
  await setupProject(page);
  await addTasks(page, ['Multi A', 'Multi B', 'Multi C', 'Multi D']);

  const tasks = page.locator('[data-task-id]');

  // Click first (anchor=0, selection={0})
  await tasks.nth(0).click();

  // Ctrl+click second (anchor=1, selection={0,1})
  await page.keyboard.down('Control');
  await tasks.nth(1).click();
  await page.keyboard.up('Control');

  // Ctrl+Shift+click fourth → adds range 1..3
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await tasks.nth(3).click();
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');

  for (let i = 0; i < 4; i++) {
    expect(await isSelected(tasks.nth(i))).toBe(true);
  }
});

test('should_select_all_tasks_when_ctrl_a_pressed', async ({ page }) => {
  await setupProject(page);
  await addTasks(page, ['Task A', 'Task B', 'Task C']);

  const tasks = page.locator('[data-task-id]');
  const count = await tasks.count();

  // Click first to establish selection context
  await tasks.nth(0).click();

  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');

  for (let i = 0; i < count; i++) {
    expect(await isSelected(tasks.nth(i))).toBe(true);
  }
});

test('should_auto_select_task_when_resized', async ({ page }) => {
  await setupProject(page);
  await addTasks(page, ['Task to Resize']);

  const task = page.locator('[data-task-id]').first();
  const box = await task.boundingBox();

  // Drag left resize handle
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 30, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();

  await page.waitForFunction(() => {
    const t = document.querySelector('[data-task-id]');
    return t && t.getAttribute('aria-selected') === 'true';
  }, { timeout: 5000 });

  expect(await isSelected(task)).toBe(true);
  await expect(page.locator('[data-testid="details-panel-header"]')).toBeVisible();
});
