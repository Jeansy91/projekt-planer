import { test, expect } from '@playwright/test';
import de from '../../src/locales/de.json' with { type: 'json' };
import en from '../../src/locales/en.json' with { type: 'json' };
import { setupProject } from '../helpers';

// -- Language Dropdown --------------------------------------------------------

test('should_open_language_dropdown_and_show_options', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="language-toggle"]');

  await expect(page.locator('[data-testid="language-menu"]')).toBeVisible();
  await expect(page.locator('[data-testid="lang-option-de"]')).toBeVisible();
  await expect(page.locator('[data-testid="lang-option-en"]')).toBeVisible();
});

test('should_close_language_dropdown_when_clicking_outside', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="language-toggle"]');
  await expect(page.locator('[data-testid="language-menu"]')).toBeVisible();

  await page.click('body', { position: { x: 10, y: 10 } });

  await expect(page.locator('[data-testid="language-menu"]')).not.toBeVisible();
});

test('should_toggle_language_dropdown_on_repeated_clicks', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="language-toggle"]');
  await expect(page.locator('[data-testid="language-menu"]')).toBeVisible();

  await page.click('[data-testid="language-toggle"]');
  await expect(page.locator('[data-testid="language-menu"]')).not.toBeVisible();
});

test('should_highlight_active_language_option', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="language-toggle"]');

  await expect(page.locator('[data-testid="lang-option-de"]')).toHaveClass(/bg-blue-100/);
  await expect(page.locator('[data-testid="lang-option-de"]')).toHaveClass(/font-semibold/);
});

// -- Switching to English -----------------------------------------------------

test('should_translate_ui_elements_when_switching_to_english', async ({ page }) => {
  await setupProject(page);

  await expect(page.locator('[data-testid="today-btn"]')).toHaveText(de.calendar.today);

  await page.click('[data-testid="language-toggle"]');
  await page.click('[data-testid="lang-option-en"]');

  await expect(page.locator('[data-testid="today-btn"]')).toHaveText(en.calendar.today);
  await expect(page.locator('[data-testid="add-task-null"]')).toContainText(en.tasks.actions.newTask);
});

test('should_translate_schedule_label_when_switching_to_english', async ({ page }) => {
  await setupProject(page);

  const label = page.locator('[data-testid="calendar-header"] span.text-xs.font-bold');
  await expect(label).toHaveText(de.calendar.schedule);

  await page.click('[data-testid="language-toggle"]');
  await page.click('[data-testid="lang-option-en"]');

  await expect(label).toHaveText(en.calendar.schedule);
});

test('should_restore_german_when_switching_back', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="language-toggle"]');
  await page.click('[data-testid="lang-option-en"]');
  await expect(page.locator('[data-testid="today-btn"]')).toHaveText(en.calendar.today);

  await page.click('[data-testid="language-toggle"]');
  await page.click('[data-testid="lang-option-de"]');

  await expect(page.locator('[data-testid="today-btn"]')).toHaveText(de.calendar.today);
});

test('should_persist_language_after_page_reload', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="language-toggle"]');
  await page.click('[data-testid="lang-option-en"]');
  await expect(page.locator('[data-testid="today-btn"]')).toHaveText(en.calendar.today);

  await page.reload();

  await expect(page.locator('[data-testid="today-btn"]')).toHaveText(en.calendar.today);
});

// -- Component translations ---------------------------------------------------

test('should_translate_details_panel_when_switching_language', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Test Task');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');
  await page.click('[data-task-id]');

  await expect(page.locator('[data-testid="details-panel-header"]')).toContainText(de.details.title);
  await expect(page.locator('[data-testid="delete-task-btn"]')).toContainText(de.details.actions.deleteTask);

  await page.click('[data-testid="language-toggle"]');
  await page.click('[data-testid="lang-option-en"]');

  await expect(page.locator('[data-testid="details-panel-header"]')).toContainText(en.details.title);
  await expect(page.locator('[data-testid="delete-task-btn"]')).toContainText(en.details.actions.deleteTask);
});

test('should_translate_team_ui_when_switching_language', async ({ page }) => {
  await setupProject(page);

  await expect(page.locator('[data-testid="add-team-btn"]')).toContainText(de.teams.actions.newTeam);
  await expect(page.locator('[data-team-id="null"] [data-testid="team-name"]')).toContainText(de.teams.unassigned);

  await page.click('[data-testid="language-toggle"]');
  await page.click('[data-testid="lang-option-en"]');

  await expect(page.locator('[data-testid="add-team-btn"]')).toContainText(en.teams.actions.newTeam);
  await expect(page.locator('[data-team-id="null"] [data-testid="team-name"]')).toContainText(en.teams.unassigned);
});

test('should_translate_delete_dialog_when_in_english', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Delete Test');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');
  await page.click('[data-task-id]');

  await page.click('[data-testid="language-toggle"]');
  await page.click('[data-testid="lang-option-en"]');

  await page.click('[data-testid="delete-task-btn"]');

  const dialog = page.locator('[data-testid="confirm-modal"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-testid="confirm-cancel-btn"]')).toContainText(en.dialogs.delete.cancel);
  await expect(dialog.locator('[data-testid="confirm-delete-btn"]')).toContainText(en.dialogs.delete.confirm);

  await page.click('[data-testid="confirm-cancel-btn"]');
});

test('should_change_week_label_format_with_language', async ({ page }) => {
  await setupProject(page);

  const weekLabels = page.locator('[data-testid="calendar-header"] .tracking-tighter .flex');
  const germanText = await weekLabels.first().textContent();
  expect(germanText).toMatch(new RegExp(`^${de.calendar.calendarWeek}\\d+$`));

  await page.click('[data-testid="language-toggle"]');
  await page.click('[data-testid="lang-option-en"]');

  const englishText = await weekLabels.first().textContent();
  expect(englishText).toMatch(new RegExp(`^${en.calendar.calendarWeek}\\d+$`));
});

// -- Info modal ---------------------------------------------------------------

test('should_open_info_modal_with_project_details', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="info-btn"]');

  const modal = page.locator('[data-testid="info-modal"]');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Projekt-Planer');
  await expect(modal).toContainText('AGPL-3.0');
  await expect(modal.locator('[data-testid="author-link"]')).toHaveText('Jeansy91');
  await expect(modal.locator('[data-testid="author-link"]')).toHaveAttribute('href', 'https://github.com/Jeansy91');
  await expect(modal.locator('[data-testid="source-code-link"]')).toHaveAttribute('href', /github\.com\/Jeansy91\/projekt-planer/);
  await expect(modal).toContainText(de.info.shortcutsTitle);
});
