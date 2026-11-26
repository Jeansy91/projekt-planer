import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Tests --------------------------------------------------------------------

test('should_collapse_and_expand_unassigned_group', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Collapse Test');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');

  const task = page.locator('[data-task-id]');
  await expect(task).toBeVisible();

  // Collapse
  const collapseBtn = page.locator('[data-team-id="null"]').locator('button').first();
  await collapseBtn.click();

  await expect(task).toHaveCount(0);
  await expect(page.locator('[data-testid="add-task-null"]')).toHaveCount(0);

  // Expand
  await collapseBtn.click();

  await expect(page.locator('[data-task-id]')).toBeVisible();
});

test('should_persist_collapse_state_after_reload', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Persist Collapse');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');

  // Collapse
  const collapseBtn = page.locator('[data-team-id="null"]').locator('button').first();
  await collapseBtn.click();
  await expect(page.locator('[data-task-id]')).toHaveCount(0);

  // Wait for persistence
  await page.waitForFunction(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('planner_project_'));
    if (!key) return false;
    const project = JSON.parse(localStorage.getItem(key));
    return project.unassignedGroupCollapsed === true;
  }, { timeout: 5000 });

  await page.reload();
  await page.waitForSelector('[data-team-id="null"]');

  // Should still be collapsed
  await expect(page.locator('[data-task-id]')).toHaveCount(0);
  await expect(page.locator('[data-testid="add-task-null"]')).toHaveCount(0);

  // Expand and verify task still exists
  await page.locator('[data-team-id="null"]').locator('button').first().click();
  await expect(page.locator('text=Persist Collapse')).toBeVisible();
});

test('should_auto_expand_collapsed_team_when_dragging_over', async ({ page }) => {
  await setupProject(page);

  // Create team
  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', 'Target Team');
  await page.keyboard.press('Enter');
  await expect(page.locator('text=Target Team')).toBeVisible();

  // Create task in unassigned
  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Drag Task');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');

  // Collapse target team
  const targetTeamDiv = page.locator('[data-team-id]').nth(0);
  await targetTeamDiv.locator('button').first().click();

  const targetTeamId = await targetTeamDiv.getAttribute('data-team-id');
  await expect(page.locator(`[data-testid="add-task-${targetTeamId}"]`)).toHaveCount(0);

  // Drag task over collapsed team
  const task = page.locator('[data-task-id]').first();
  const taskBox = await task.boundingBox();
  const targetBox = await targetTeamDiv.boundingBox();

  await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(taskBox.x + taskBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });

  // Team should auto-expand
  await expect(page.locator(`[data-testid="add-task-${targetTeamId}"]`)).toBeVisible({ timeout: 3000 });

  await page.mouse.up();
});
