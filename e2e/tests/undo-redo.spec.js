import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers.js';

async function addTask(page, title) {
  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', title);
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');
}

async function waitForUndoReady(page, minDepth) {
  // Wait for the undo debounce (800ms) to flush the snapshot
  await page.waitForFunction((depth) => {
    const btn = document.querySelector('[data-testid="undo-btn"]');
    if (!btn || btn.disabled) return false;
    if (depth !== undefined) return parseInt(btn.dataset.undoDepth) >= depth;
    return true;
  }, minDepth, { timeout: 3000 });
}

test('should_disable_undo_button_when_stack_empty', async ({ page }) => {
  // Arrange
  await setupProject(page);

  // Assert
  const undoBtn = page.locator('[data-testid="undo-btn"]');
  const redoBtn = page.locator('[data-testid="redo-btn"]');
  await expect(undoBtn).toBeDisabled();
  await expect(redoBtn).toBeDisabled();
});

test('should_undo_task_creation_when_ctrl_z_pressed', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Undo Me');
  await expect(page.locator('[data-task-id]')).toHaveCount(1);
  await waitForUndoReady(page);

  // Act
  await page.keyboard.press('Control+z');

  // Assert
  await expect(page.locator('[data-task-id]')).toHaveCount(0);
});

test('should_redo_task_creation_when_ctrl_y_pressed', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Redo Me');
  await waitForUndoReady(page);
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-task-id]')).toHaveCount(0);

  // Act
  await page.keyboard.press('Control+y');

  // Assert
  await expect(page.locator('[data-task-id]')).toHaveCount(1);
});

test('should_undo_task_deletion_when_ctrl_z_pressed', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Delete Then Undo');
  await waitForUndoReady(page);
  await page.locator('[data-task-id]').first().click();
  await page.waitForSelector('[data-testid="details-panel"]');
  await page.locator('[data-testid="delete-task-btn"]').click();
  await page.locator('[data-testid="confirm-delete-btn"]').click();
  await expect(page.locator('[data-task-id]')).toHaveCount(0);
  await waitForUndoReady(page);

  // Act
  await page.keyboard.press('Control+z');

  // Assert
  await expect(page.locator('[data-task-id]')).toHaveCount(1);
});

test('should_undo_task_edit_when_ctrl_z_pressed', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Original');
  await waitForUndoReady(page);
  await page.locator('[data-task-id]').first().click();
  await page.waitForSelector('[data-testid="details-panel"]');
  const titleInput = page.locator('[data-testid="task-title-input"]');
  await titleInput.fill('Changed');
  await titleInput.press('Tab');
  await waitForUndoReady(page);

  // Act
  await page.keyboard.press('Control+z');

  // Assert
  await page.locator('[data-task-id]').first().click();
  await expect(page.locator('[data-testid="task-title-input"]')).toHaveValue('Original');
});

test('should_undo_team_deletion_and_restore_tasks', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await page.locator('[data-testid="add-team-btn"]').click();
  await page.locator('[data-testid="add-team-input"]').fill('Test Team');
  await page.locator('[data-testid="add-team-submit"]').click();
  await expect(page.locator('text=Test Team')).toBeVisible();
  await waitForUndoReady(page, 1);

  // Add task scoped to the new team
  const teamDiv = page.locator('[data-team-id]').filter({ hasText: 'Test Team' });
  await teamDiv.locator('[data-testid^="add-task-"]').click();
  await page.fill('[data-testid="task-name-input"]', 'Team Task');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');
  await waitForUndoReady(page, 2);

  // Delete the team via trash button + confirmation
  await teamDiv.locator('[data-testid^="team-delete-"]').click();
  await page.locator('[data-testid="confirm-delete-btn"]').click();
  await expect(page.locator('text=Test Team')).toHaveCount(0);
  await expect(page.locator('[data-task-id]')).toHaveCount(0);
  await waitForUndoReady(page, 3);

  // Act
  await page.keyboard.press('Control+z');

  // Assert — team and its task are restored
  await expect(page.locator('[data-testid="team-name"]').filter({ hasText: 'Test Team' })).toBeVisible();
  await expect(page.locator('[data-task-id]')).toHaveCount(1);
});

test('should_clear_redo_stack_when_new_action_after_undo', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'First');
  await waitForUndoReady(page);
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-task-id]')).toHaveCount(0);
  const redoBtn = page.locator('[data-testid="redo-btn"]');
  await expect(redoBtn).toBeEnabled();

  // Act — perform a new action (should clear redo stack)
  await addTask(page, 'Second');
  await waitForUndoReady(page);

  // Assert — redo should be disabled now
  await expect(redoBtn).toBeDisabled();
});

test('should_undo_via_button_click', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Button Undo');
  await waitForUndoReady(page);

  // Act
  await page.locator('[data-testid="undo-btn"]').click();

  // Assert
  await expect(page.locator('[data-task-id]')).toHaveCount(0);
});

test('should_redo_via_button_click', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Button Redo');
  await waitForUndoReady(page);
  await page.locator('[data-testid="undo-btn"]').click();
  await expect(page.locator('[data-task-id]')).toHaveCount(0);

  // Act
  await page.locator('[data-testid="redo-btn"]').click();

  // Assert
  await expect(page.locator('[data-task-id]')).toHaveCount(1);
});

test('should_disable_redo_button_when_stack_empty', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'No Redo');
  await waitForUndoReady(page);

  // Assert — redo should be disabled (no undo was performed)
  await expect(page.locator('[data-testid="redo-btn"]')).toBeDisabled();
});

test('should_undo_notes_change_when_ctrl_z_pressed_after_blur', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Notes Task');
  await page.locator('[data-task-id]').first().click();
  await page.waitForSelector('[data-testid="task-notes-editor"]');
  const editor = page.locator('[data-testid="task-notes-editor"] [contenteditable]');
  await editor.click();

  // Act — type notes then blur to trigger save
  await page.keyboard.type('Hello notes');
  await page.locator('[data-testid="task-title-input"]').click(); // blur notes editor

  // Wait for notes to be flushed into undo stack (depth >= 2: task creation + notes edit)
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="undo-btn"]');
    return btn && !btn.disabled && parseInt(btn.dataset.undoDepth || '0') >= 2;
  }, { timeout: 3000 });

  // Act — undo the notes change
  await page.keyboard.press('Control+z');

  // Assert — notes field is empty again
  await page.locator('[data-task-id]').first().click();
  await page.waitForSelector('[data-testid="task-notes-editor"]');
  const noteText = await page.locator('[data-testid="task-notes-editor"] [contenteditable]').innerText();
  expect(noteText.trim()).toBe('');
});

test('should_not_trigger_app_undo_when_ctrl_z_pressed_inside_notes_editor', async ({ page }) => {
  // Arrange — create a task so the app undo stack is non-empty
  await setupProject(page);
  await addTask(page, 'Guard Task');
  await waitForUndoReady(page);

  // Open details panel and focus the notes editor
  await page.locator('[data-task-id]').first().click();
  await page.waitForSelector('[data-testid="task-notes-editor"]');
  const editor = page.locator('[data-testid="task-notes-editor"] [contenteditable]');
  await editor.click();
  await page.keyboard.type('Draft notes');

  // Act — Ctrl+Z inside contenteditable must be handled by the editor, not the app
  await page.keyboard.press('Control+z');

  // Assert — the task still exists (app-level undo was NOT triggered)
  await expect(page.locator('[data-task-id]')).toHaveCount(1);
});
