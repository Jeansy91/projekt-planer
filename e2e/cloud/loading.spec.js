import { test, expect } from '@playwright/test';
import { register, createCloudProject, uniqueEmail } from './helpers';

const DELAY_MS = 2500;

const delaySettings = (page) =>
  page.route('**/rest/v1/user_project_settings*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    await route.continue();
  });

test('should_lock_editing_while_project_loads_and_allow_it_afterwards', async ({ page }) => {
  test.setTimeout(120000);

  // Arrange: a cloud project that is opened again with a slow boot
  const title = `Loading ${Date.now()}`;
  const teamName = `Team ${Date.now()}`;
  await test.step('create cloud project', async () => {
    await register(page, uniqueEmail('owner'), 'Owner');
    await createCloudProject(page, title);
    // Cloud sync is debounced: give the rename time to reach the database
    await page.waitForTimeout(2000);
  });
  await delaySettings(page);

  // Act
  await test.step('reload with delayed boot', () => page.reload());

  // Assert: loading hint visible, every edit entry point is absent
  await test.step('editing is locked while loading', async () => {
    const loading = page.locator('[data-testid="project-loading"]');
    await expect(loading).toBeVisible();
    await expect(loading).toHaveAttribute('role', 'status');
    await expect(page.locator('[data-testid="calendar-grid"]')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('[data-testid="add-team-btn"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="add-task-null"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="undo-btn"]')).toHaveCount(0);
    await page.locator('[data-testid="project-title"]').click();
    await expect(page.locator('[data-testid="project-title-input"]')).toHaveCount(0);
  });

  // Assert: afterwards everything works and changes persist
  await test.step('editing works after loading', async () => {
    await expect(page.locator('[data-testid="project-loading"]')).toBeHidden({ timeout: 15000 });
    await expect(page.locator('[data-testid="project-title"]')).toHaveText(title);
    await expect(page.locator('[data-testid="calendar-grid"]')).toHaveAttribute('aria-busy', 'false');
    await page.click('[data-testid="add-team-btn"]');
    await page.fill('[data-testid="add-team-input"]', teamName);
    await page.click('[data-testid="add-team-submit"]');
    await expect(page.getByText(teamName).first()).toBeVisible();
  });

  await test.step('change survives a reload', async () => {
    await page.unroute('**/rest/v1/user_project_settings*');
    await page.waitForTimeout(1500);
    await page.reload();
    await expect(page.getByText(teamName).first()).toBeVisible({ timeout: 15000 });
  });
});

test('should_keep_changes_made_right_after_loading_finishes', async ({ page }) => {
  test.setTimeout(120000);

  // Arrange
  const title = `Race ${Date.now()}`;
  const newTitle = `Renamed ${Date.now()}`;
  await register(page, uniqueEmail('owner'), 'Owner');
  await createCloudProject(page, title);
  await page.waitForTimeout(2000);
  await delaySettings(page);
  await page.reload();

  // Act: rename as soon as the title is editable
  await expect(page.locator('[data-testid="add-team-btn"]')).toBeVisible({ timeout: 15000 });
  await page.click('[data-testid="project-title"]');
  await page.fill('[data-testid="project-title-input"]', newTitle);
  await page.keyboard.press('Enter');

  // Assert
  await page.unroute('**/rest/v1/user_project_settings*');
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.locator('[data-testid="project-title"]')).toHaveText(newTitle, { timeout: 15000 });
});
