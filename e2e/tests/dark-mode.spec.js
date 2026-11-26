import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers.js';

test.describe('Dark Mode', () => {
  test('should_apply_dark_class_when_dark_theme_selected', async ({ page }) => {
    // Arrange
    await setupProject(page);

    // Act — set theme to dark via localStorage and reload
    await page.evaluate(() => localStorage.setItem('user_theme', 'dark'));
    await page.reload();
    await page.waitForSelector('[data-testid="add-task-null"]');

    // Assert
    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDarkClass).toBe(true);
  });

  test('should_not_have_dark_class_when_light_theme_selected', async ({ page }) => {
    // Arrange
    await setupProject(page);

    // Act
    await page.evaluate(() => localStorage.setItem('user_theme', 'light'));
    await page.reload();
    await page.waitForSelector('[data-testid="add-task-null"]');

    // Assert
    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDarkClass).toBe(false);
  });

  test('should_follow_system_preference_when_system_selected', async ({ page }) => {
    // Arrange — emulate dark system preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await setupProject(page);

    // Act
    await page.evaluate(() => localStorage.setItem('user_theme', 'system'));
    await page.reload();
    await page.waitForSelector('[data-testid="add-task-null"]');

    // Assert — system is dark, so dark class should be applied
    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDarkClass).toBe(true);
  });

  test('should_persist_theme_across_reload', async ({ page }) => {
    // Arrange
    await setupProject(page);

    // Act — set dark theme
    await page.evaluate(() => localStorage.setItem('user_theme', 'dark'));
    await page.reload();
    await page.waitForSelector('[data-testid="add-task-null"]');

    // Assert — theme persisted
    const storedTheme = await page.evaluate(() => localStorage.getItem('user_theme'));
    expect(storedTheme).toBe('dark');
    const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDarkClass).toBe(true);
  });

  test('should_remove_no_transition_class_after_theme_switch', async ({ page }) => {
    // Arrange
    await setupProject(page);
    await page.evaluate(() => localStorage.setItem('user_theme', 'light'));
    await page.reload();
    await page.waitForSelector('[data-testid="add-task-null"]');

    // Act — switch to dark via localStorage and reload
    await page.evaluate(() => localStorage.setItem('user_theme', 'dark'));
    await page.reload();
    await page.waitForSelector('[data-testid="add-task-null"]');

    // Assert — no-transition is cleaned up within two animation frames
    await page.waitForFunction(
      () => !document.documentElement.classList.contains('no-transition'),
      { timeout: 2000 }
    );
    const hasNoTransition = await page.evaluate(() => document.documentElement.classList.contains('no-transition'));
    expect(hasNoTransition).toBe(false);
  });

  test('should_apply_dark_background_to_body_in_dark_mode', async ({ page }) => {
    // Arrange
    await setupProject(page);

    // Act
    await page.evaluate(() => localStorage.setItem('user_theme', 'dark'));
    await page.reload();
    await page.waitForSelector('[data-testid="add-task-null"]');

    // Assert — the main container should have dark background styles applied
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    // In dark mode, bg-slate-900 is a very dark color (rgb close to 15, 23, 42)
    expect(bgColor).not.toBe('rgb(248, 250, 252)'); // not slate-50 (light)
  });
});
