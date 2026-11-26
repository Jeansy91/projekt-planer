import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers.js';

async function addTask(page, title) {
  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', title);
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');
}

async function flushHistory(page) {
  // Dispatch focus event to flush the debounced history timer in useUndoRedo
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}

async function openHistory(page) {
  await flushHistory(page);
  await page.locator('[data-testid="history-btn"]').click();
  await page.waitForSelector('[role="dialog"]');
}

test('should_show_history_modal_when_history_button_clicked', async ({ page }) => {
  // Arrange
  await setupProject(page);

  // Act
  await openHistory(page);

  // Assert
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});

test('should_show_empty_state_when_no_history', async ({ page }) => {
  // Arrange
  await setupProject(page);

  // Act
  await openHistory(page);

  // Assert
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.locator('text=Noch keine Aktivitäten')).toBeVisible();
});

test('should_record_task_creation_when_task_added', async ({ page }) => {
  // Arrange
  await setupProject(page);

  // Act
  await addTask(page, 'History Test Task');
  await openHistory(page);

  // Assert
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.locator('text=History Test Task')).toBeVisible();
  await expect(dialog.locator('text=erstellt')).toBeVisible();
});

test('should_record_task_deletion_when_task_deleted', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Delete Me');
  await flushHistory(page);
  await page.locator('[data-task-id]').first().click();
  await page.waitForSelector('[data-testid="details-panel"]');

  // Act
  await page.locator('[data-testid="delete-task-btn"]').click();
  await page.locator('[data-testid="confirm-delete-btn"]').click();
  await openHistory(page);

  // Assert
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.locator('text=Delete Me')).toHaveCount(2); // created + deleted
  await expect(dialog.locator('text=gelöscht')).toBeVisible();
});

test('should_record_team_creation_when_team_added', async ({ page }) => {
  // Arrange
  await setupProject(page);

  // Act
  await page.locator('[data-testid="add-team-btn"]').click();
  await page.locator('[data-testid="add-team-input"]').fill('QA Team');
  await page.locator('[data-testid="add-team-submit"]').click();
  await openHistory(page);

  // Assert
  const entry = page.locator('[role="dialog"] [data-testid="history-entry"]')
    .filter({ hasText: 'QA Team' })
    .first();
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAttribute('data-entity', 'team');
  await expect(entry).toHaveAttribute('data-action', 'created');
});

test('should_record_task_update_when_task_edited', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Original Name');
  await flushHistory(page);
  await page.locator('[data-task-id]').first().click();
  await page.waitForSelector('[data-testid="details-panel"]');

  // Act
  const titleInput = page.locator('[data-testid="task-title-input"]');
  await titleInput.fill('Updated Name');
  await titleInput.press('Tab');
  await openHistory(page);

  // Assert
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.locator('text=aktualisiert')).toBeVisible();
});

test('should_show_entries_newest_first', async ({ page }) => {
  // Arrange
  await setupProject(page);

  // Act
  await addTask(page, 'First Task');
  await flushHistory(page);
  await addTask(page, 'Second Task');
  await openHistory(page);

  // Assert — Second Task should appear before First Task
  const dialog = page.locator('[role="dialog"]');
  const allText = await dialog.innerText();
  const secondIdx = allText.indexOf('Second Task');
  const firstIdx = allText.indexOf('First Task');
  expect(secondIdx).toBeLessThan(firstIdx);
});

test('should_close_history_modal_when_close_clicked', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await openHistory(page);

  // Act
  await page.locator('[role="dialog"] button[aria-label]').first().click();

  // Assert
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
});

// ── Undo/redo ↔ history integration ─────────────────────────────────

async function waitForUndoReady(page) {
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="undo-btn"]');
    return btn && !btn.disabled;
  }, undefined, { timeout: 3000 });
}

test('should_remove_history_entry_when_action_undone', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Undo History');
  await waitForUndoReady(page);

  // Verify entry exists
  await openHistory(page);
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.locator('text=Undo History')).toBeVisible();
  await page.locator('[role="dialog"] button[aria-label]').first().click();

  // Act
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-task-id]')).toHaveCount(0);

  // Assert — history entry should be gone
  await openHistory(page);
  await expect(page.locator('[role="dialog"]').locator('text=Undo History')).toHaveCount(0);
});

test('should_restore_history_entry_when_action_redone', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Redo History');
  await waitForUndoReady(page);
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-task-id]')).toHaveCount(0);

  // Act
  await page.keyboard.press('Control+y');
  await expect(page.locator('[data-task-id]')).toHaveCount(1);

  // Assert — history entry should be back
  await openHistory(page);
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.locator('text=Redo History')).toBeVisible();
});

test('should_overwrite_forward_history_when_new_action_after_undo', async ({ page }) => {
  // Arrange
  await setupProject(page);
  await addTask(page, 'Task A');
  await waitForUndoReady(page);
  await addTask(page, 'Task B');
  await waitForUndoReady(page);

  // Undo Task B creation
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-task-id]')).toHaveCount(1);

  // Verify redo is available (confirms undo completed)
  await expect(page.locator('[data-testid="redo-btn"]')).toBeEnabled();

  // Act — create Task C (should overwrite Task B's forward history)
  await addTask(page, 'Task C');
  await waitForUndoReady(page);

  // Assert — history should show Task A and Task C, not Task B
  await openHistory(page);
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.locator('text=Task A')).toBeVisible();
  await expect(dialog.locator('text=Task C')).toBeVisible();
  await expect(dialog.locator('text=Task B')).toHaveCount(0);
});
