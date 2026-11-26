import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Density ------------------------------------------------------------------

test('should_change_task_height_when_density_selected', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Density Test');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');

  const task = page.locator('[data-task-id]').first();
  const densityBtn = page.locator('[data-testid="density-btn"]');

  // Default: comfortable (36px)
  expect((await task.boundingBox()).height).toBe(36);

  // Compact (28px)
  await densityBtn.click();
  await page.click('[data-testid="density-option-compact"]');
  expect((await task.boundingBox()).height).toBe(28);

  // Dense (22px)
  await densityBtn.click();
  await page.click('[data-testid="density-option-dense"]');
  expect((await task.boundingBox()).height).toBe(22);

  // Back to comfortable (36px)
  await densityBtn.click();
  await page.click('[data-testid="density-option-comfortable"]');
  expect((await task.boundingBox()).height).toBe(36);
});

// -- Zoom dropdown ------------------------------------------------------------

test('should_select_zoom_value_and_close_dropdown', async ({ page }) => {
  await setupProject(page);

  const zoomBtn = page.locator('[data-testid="zoom-btn"]');
  await expect(page.locator('[data-testid="zoom-dropdown"]')).toHaveCount(0);

  await zoomBtn.click();
  await expect(page.locator('[data-testid="zoom-dropdown"]')).toBeVisible();

  await page.locator('[data-testid="zoom-option-26"]').click();

  await expect(page.locator('[data-testid="zoom-dropdown"]')).toHaveCount(0);
  await expect(zoomBtn).toContainText('26');
});

test('should_toggle_zoom_dropdown_on_repeated_clicks', async ({ page }) => {
  await setupProject(page);

  const zoomBtn = page.locator('[data-testid="zoom-btn"]');

  await zoomBtn.click();
  await expect(page.locator('[data-testid="zoom-dropdown"]')).toBeVisible();

  await zoomBtn.click();
  await expect(page.locator('[data-testid="zoom-dropdown"]')).toHaveCount(0);
});

// -- Ctrl+Wheel zoom ----------------------------------------------------------

test('should_adjust_weeks_when_ctrl_wheel_used', async ({ page }) => {
  await setupProject(page);

  const zoomBtn = page.locator('[data-testid="zoom-btn"]');
  const initialText = await zoomBtn.textContent();
  const initial = parseInt(initialText.match(/(\d+)/)[1], 10);
  expect(initial).not.toBeNull();

  await page.evaluate(() => {
    const container = document.querySelector('[data-testid="calendar-grid"]');
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, ctrlKey: true, bubbles: true, cancelable: true }));
  });

  const afterText = await zoomBtn.textContent();
  const after = parseInt(afterText.match(/(\d+)/)[1], 10);
  expect(after).toBeGreaterThan(0);
});

// -- Today button -------------------------------------------------------------

test('should_show_one_previous_week_when_today_clicked_with_default_zoom', async ({ page }) => {
  // Arrange – default zoom is 12 weeks (≤19), navigate away from today
  await setupProject(page);
  await page.click('[data-testid="prev-week-btn"]');
  await page.click('[data-testid="prev-week-btn"]');
  await page.click('[data-testid="prev-week-btn"]');
  await page.click('[data-testid="prev-week-btn"]');

  // Act
  await page.click('[data-testid="today-btn"]');

  // Assert – current week should be at index 1 (second column), meaning 1 week is shown before it
  const weekColumns = page.locator('[data-testid="calendar-header"] .flex-1');
  await expect(weekColumns.nth(1)).toHaveClass(/bg-slate-100/);
  await expect(weekColumns.nth(0)).not.toHaveClass(/bg-slate-100/);
});

test('should_show_two_previous_weeks_when_today_clicked_with_large_zoom', async ({ page }) => {
  // Arrange – set zoom to 20+ weeks, then navigate away from today
  await setupProject(page);
  const zoomBtn = page.locator('[data-testid="zoom-btn"]');
  await zoomBtn.click();
  await page.locator('[data-testid="zoom-option-26"]').click();

  await page.click('[data-testid="prev-week-btn"]');
  await page.click('[data-testid="prev-week-btn"]');
  await page.click('[data-testid="prev-week-btn"]');
  await page.click('[data-testid="prev-week-btn"]');

  // Act
  await page.click('[data-testid="today-btn"]');

  // Assert – current week should be at index 2 (third column), meaning 2 weeks are shown before it
  const weekColumns = page.locator('[data-testid="calendar-header"] .flex-1');
  await expect(weekColumns.nth(2)).toHaveClass(/bg-slate-100/);
  await expect(weekColumns.nth(1)).not.toHaveClass(/bg-slate-100/);
});

// -- Shift+Wheel horizontal scroll -------------------------------------------

test('should_scroll_calendar_when_shift_wheel_used', async ({ page }) => {
  await setupProject(page);

  const getFirstKW = () => page.evaluate(() => {
    const el = document.querySelectorAll('[data-testid="calendar-header"] .flex-1');
    if (!el.length) return null;
    const m = el[0].textContent.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  });

  const initialKW = await getFirstKW();
  expect(initialKW).not.toBeNull();

  await page.locator('[data-testid="calendar-grid"]').evaluate(el => {
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, shiftKey: true, bubbles: true, cancelable: true }));
  });

  // Wait for the KW to change
  await page.waitForFunction((prev) => {
    const el = document.querySelectorAll('[data-testid="calendar-header"] .flex-1');
    if (!el.length) return false;
    const m = el[0].textContent.match(/(\d+)/);
    return m && parseInt(m[1], 10) !== prev;
  }, initialKW, { timeout: 3000 });

  const newKW = await getFirstKW();
  expect(newKW).toBeGreaterThan(initialKW);
});

test('should_scroll_calendar_forward_when_shift_wheel_used_on_mac', async ({ page }) => {
  // Arrange: macOS Chrome/Safari swap axes when Shift is held — value arrives in deltaX, deltaY is 0
  await setupProject(page);

  const getFirstKW = () => page.evaluate(() => {
    const el = document.querySelectorAll('[data-testid="calendar-header"] .flex-1');
    if (!el.length) return null;
    const m = el[0].textContent.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  });

  const initialKW = await getFirstKW();
  expect(initialKW).not.toBeNull();

  // Act: simulate Mac Shift+wheel (deltaX carries the value, deltaY is 0)
  await page.locator('[data-testid="calendar-grid"]').evaluate(el => {
    el.dispatchEvent(new WheelEvent('wheel', { deltaX: 100, deltaY: 0, shiftKey: true, bubbles: true, cancelable: true }));
  });

  await page.waitForFunction((prev) => {
    const el = document.querySelectorAll('[data-testid="calendar-header"] .flex-1');
    if (!el.length) return false;
    const m = el[0].textContent.match(/(\d+)/);
    return m && parseInt(m[1], 10) !== prev;
  }, initialKW, { timeout: 3000 });

  // Assert: scrolling forward (positive delta) must move to a later KW, not earlier
  const newKW = await getFirstKW();
  expect(newKW).toBeGreaterThan(initialKW);
});
