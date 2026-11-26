import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Tests --------------------------------------------------------------------

test('should_create_team_when_name_entered', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', 'Backend');
  await page.keyboard.press('Enter');

  const teamDivs = page.locator('[data-team-id]');
  const count = await teamDivs.count();
  expect(count).toBeGreaterThan(0);
  await expect(page.locator('text=Backend')).toBeVisible();
});

test('should_rename_team_when_edited_via_detail_modal', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', 'Old Name');
  await page.keyboard.press('Enter');
  await expect(page.locator('text=Old Name')).toBeVisible();

  // Open team detail modal via edit button
  const teamDiv = page.locator('[data-team-id]').filter({ hasText: 'Old Name' });
  await teamDiv.locator('[data-testid^="team-edit-"]').click();

  // Verify modal opens with current name
  const nameInput = page.locator('[data-testid="team-detail-name"]');
  await expect(nameInput).toBeVisible();
  await expect(nameInput).toHaveValue('Old Name');

  // Change name and save
  await nameInput.fill('New Name');
  await page.click('[data-testid="team-detail-save"]');

  await expect(page.locator('[data-team-id]').filter({ hasText: 'New Name' })).toBeVisible();
  await expect(page.locator('[data-testid="team-name"]').filter({ hasText: 'Old Name' })).toHaveCount(0);
});

test('should_update_team_color_via_detail_modal', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', 'Color Team');
  await page.keyboard.press('Enter');
  await expect(page.locator('text=Color Team')).toBeVisible();

  // Open team detail modal
  const teamDiv = page.locator('[data-team-id]').filter({ hasText: 'Color Team' });
  await teamDiv.locator('[data-testid^="team-edit-"]').click();

  // Select a different color (violet)
  await page.click('[data-testid="team-color-violet"]');
  await page.click('[data-testid="team-detail-save"]');

  // Verify team header now uses violet styling
  const updatedTeam = page.locator('[data-team-id]').filter({ hasText: 'Color Team' });
  await expect(updatedTeam.locator('.bg-violet-600')).toBeVisible();
});

test('should_update_team_icon_via_detail_modal', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', 'Icon Team');
  await page.keyboard.press('Enter');
  await expect(page.locator('text=Icon Team')).toBeVisible();

  // Open team detail modal
  const teamDiv = page.locator('[data-team-id]').filter({ hasText: 'Icon Team' });
  await teamDiv.locator('[data-testid^="team-edit-"]').click();

  // Select a different icon (rocket)
  await page.click('[data-testid="team-icon-rocket"]');
  await page.click('[data-testid="team-detail-save"]');

  // Modal should close
  await expect(page.locator('[data-testid="team-detail-name"]')).not.toBeVisible();
  // Team should still be visible
  await expect(page.locator('[data-team-id]').filter({ hasText: 'Icon Team' })).toBeVisible();
});

test('should_open_task_overview_when_task_count_clicked', async ({ page }) => {
  await setupProject(page);

  // Create team and task
  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', 'Overview Team');
  await page.keyboard.press('Enter');
  await expect(page.locator('text=Overview Team')).toBeVisible();

  // Add a task to the team
  const teamDiv = page.locator('[data-team-id]').filter({ hasText: 'Overview Team' });
  await teamDiv.locator('[data-testid^="add-task-"]').click();
  await page.fill('[data-testid="task-name-input"]', 'Overview Task');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');

  // Click task count to open overview modal
  await teamDiv.locator('[data-testid^="team-task-count-"]').click();

  // Verify overview modal shows the task
  await expect(page.locator('[data-testid="task-overview-table"]')).toBeVisible();
  await expect(page.locator('[data-testid="task-overview-table"]').locator('text=Overview Task')).toBeVisible();

  // Close modal
  await page.click('[data-testid="close-task-overview"]');
  await expect(page.locator('[data-testid="task-overview-table"]')).not.toBeVisible();
});

test('should_delete_team_and_its_tasks_when_confirmed', async ({ page }) => {
  await setupProject(page);

  // Create team with a task
  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', 'Temp Team');
  await page.keyboard.press('Enter');
  await expect(page.locator('text=Temp Team')).toBeVisible();

  const teamDiv = page.locator('[data-team-id]').filter({ hasText: 'Temp Team' });
  await teamDiv.locator('[data-testid^="add-task-"]').click();
  await page.fill('[data-testid="task-name-input"]', 'Team Task');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');

  const tasksBefore = await page.locator('[data-task-id]').count();

  // Delete team via trash button + confirmation
  await teamDiv.locator('[data-testid^="team-delete-"]').click();
  await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
  await page.click('[data-testid="confirm-delete-btn"]');

  await expect(page.locator('text=Temp Team')).toHaveCount(0);
  const tasksAfter = await page.locator('[data-task-id]').count();
  expect(tasksAfter).toBeLessThan(tasksBefore);
});

test('should_create_multiple_teams', async ({ page }) => {
  await setupProject(page);

  for (const name of ['Frontend', 'Backend', 'DevOps']) {
    await page.click('[data-testid="add-team-btn"]');
    await page.fill('[data-testid="add-team-input"]', name);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text=${name}`)).toBeVisible();
  }

  const teamDivs = page.locator('[data-team-id]');
  // 3 created + 1 unassigned
  await expect(teamDivs).toHaveCount(4);
});

test('should_create_team_with_viewmode_selection_via_modal', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-team-btn"]');
  await expect(page.locator('[data-testid="add-team-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="viewmode-gantt"]')).toBeVisible();
  await expect(page.locator('[data-testid="viewmode-swimlane"]')).toBeVisible();

  await page.fill('[data-testid="add-team-input"]', 'Swimlane Team');
  await page.click('[data-testid="viewmode-swimlane"]');
  await page.click('[data-testid="add-team-submit"]');

  await expect(page.locator('text=Swimlane Team')).toBeVisible();
});
