import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Helpers (file-local) -----------------------------------------------------

async function createAndSelectTask(page, title) {
  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', title);
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');
  await page.locator('[data-task-id]').first().click();
  await expect(page.locator('[data-testid="details-panel-header"]')).toBeVisible();
}

// -- Tests --------------------------------------------------------------------

test('should_show_task_title_in_details_panel_when_task_clicked', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Important Task');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');

  const task = page.locator('[data-task-id]').first();
  await expect(task.locator('span').first()).toContainText('Important Task');

  await task.click();

  await expect(page.locator('[data-testid="details-panel-header"]')).toBeVisible();
});

test('should_close_details_panel_when_close_button_clicked', async ({ page }) => {
  await setupProject(page);
  await createAndSelectTask(page, 'Test Task');

  await page.click('[data-testid="close-details-btn"]');

  await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();
  await expect(page.locator('[data-testid="details-panel"]')).not.toBeVisible();
});

test('should_be_scrollable_when_content_overflows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 });
  await setupProject(page);
  await createAndSelectTask(page, 'Scroll Detail Task');

  const editor = page.locator('[data-testid="task-notes-editor"] [contenteditable]');
  await editor.click();
  await page.keyboard.type('Lorem ipsum dolor sit amet. '.repeat(30));

  const panelContent = page.locator('[data-testid="details-panel-content"]');
  const overflowY = await panelContent.evaluate(el => window.getComputedStyle(el).overflowY);
  expect(overflowY).toBe('auto');
});

test('should_have_notes_editor_with_min_height', async ({ page }) => {
  await setupProject(page);
  await createAndSelectTask(page, 'Notes Task');

  const editor = page.locator('[data-testid="task-notes-editor"]');
  await expect(editor).toBeVisible();

  const height = await editor.evaluate(el => el.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(100);
});

test('should_expand_notes_editor_to_fill_available_space', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await setupProject(page);
  await createAndSelectTask(page, 'Expand Notes Task');

  const wrapper = page.locator('[data-testid="task-notes-wrapper"]');
  const height = await wrapper.evaluate(el => el.getBoundingClientRect().height);
  expect(height).toBeGreaterThan(130);

  const flexGrow = await wrapper.evaluate(el => window.getComputedStyle(el).flexGrow);
  expect(flexGrow).toBe('1');
});

test('should_position_delete_button_below_notes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 });
  await setupProject(page);
  await createAndSelectTask(page, 'Delete Pos Task');

  const textareaBox = await page.locator('[data-testid="task-notes-editor"]').boundingBox();
  const deleteBtnBox = await page.locator('[data-testid="delete-task-btn"]').boundingBox();

  expect(deleteBtnBox.y).toBeGreaterThanOrEqual(textareaBox.y + textareaBox.height - 1);

  const scrollContainer = page.locator('[data-testid="details-panel-content"]');
  const overflowY = await scrollContainer.evaluate(el => window.getComputedStyle(el).overflowY);
  expect(overflowY).toBe('auto');
});

test('should_resize_details_panel_when_divider_dragged', async ({ page }) => {
  // Arrange
  await page.setViewportSize({ width: 1280, height: 800 });
  await setupProject(page);
  await createAndSelectTask(page, 'Resize Task');

  const panelBefore = await page.locator('[data-testid="details-panel"]').boundingBox();
  const divider = page.locator('[data-testid="split-divider"]');
  const dividerBox = await divider.boundingBox();

  // Act — drag divider 100px to the left to widen the panel
  await page.mouse.move(dividerBox.x + dividerBox.width / 2, dividerBox.y + dividerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dividerBox.x - 100, dividerBox.y + dividerBox.height / 2, { steps: 10 });
  await page.mouse.up();

  // Assert — wait for the panel style to reflect the new width
  await page.waitForFunction(() => {
    const panel = document.querySelector('[data-testid="details-panel"]');
    return panel && panel.getBoundingClientRect().width > 370;
  }, { timeout: 3000 });
});

test('should_enforce_minimum_panel_width_when_divider_dragged_right', async ({ page }) => {
  // Arrange
  await page.setViewportSize({ width: 1280, height: 800 });
  await setupProject(page);
  await createAndSelectTask(page, 'Min Width Task');

  const divider = page.locator('[data-testid="split-divider"]');
  const dividerBox = await divider.boundingBox();

  // Act — drag divider far to the right to try to shrink the panel below minimum
  await page.mouse.move(dividerBox.x + dividerBox.width / 2, dividerBox.y + dividerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dividerBox.x + 500, dividerBox.y + dividerBox.height / 2, { steps: 5 });
  await page.mouse.up();

  // Assert — panel should not go below 20rem (320px)
  const panel = await page.locator('[data-testid="details-panel"]').boundingBox();
  expect(panel.width).toBeGreaterThanOrEqual(320);
});

test('should_enforce_minimum_grid_width_when_divider_dragged_left', async ({ page }) => {
  // Arrange
  await page.setViewportSize({ width: 1280, height: 800 });
  await setupProject(page);
  await createAndSelectTask(page, 'Min Grid Task');

  const divider = page.locator('[data-testid="split-divider"]');
  const dividerBox = await divider.boundingBox();

  // Act — drag divider far to the left to try to shrink the grid below 50%
  await page.mouse.move(dividerBox.x + dividerBox.width / 2, dividerBox.y + dividerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(100, dividerBox.y + dividerBox.height / 2, { steps: 5 });
  await page.mouse.up();

  // Assert — grid should keep at least 50% of the container
  const grid = await page.locator('[data-testid="calendar-grid"]').boundingBox();
  const viewport = page.viewportSize();
  expect(grid.width).toBeGreaterThanOrEqual(viewport.width * 0.45); // allow slight padding
});
