import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Helpers (file-local) -----------------------------------------------------

async function createSwimlaneTeam(page, name) {
  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', name);
  await page.click('[data-testid="viewmode-swimlane"]');
  await page.click('[data-testid="add-team-submit"]');
  await expect(page.locator(`text=${name}`)).toBeVisible();
  const teamDiv = page.locator('[data-team-id]').filter({ hasText: name });
  return { teamDiv, teamId: await teamDiv.getAttribute('data-team-id') };
}

async function addLane(page, teamId, name) {
  await page.click(`[data-testid="add-lane-${teamId}"]`);
  await page.fill('[data-testid="lane-name-input"]', name);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="lane-name"]').filter({ hasText: name })).toBeVisible();
}

async function addStagingTask(page, teamId, title) {
  await page.click(`[data-testid="add-task-${teamId}"]`);
  await page.fill('[data-testid="task-name-input"]', title);
  await page.keyboard.press('Enter');
}

// -- Tests --------------------------------------------------------------------

test('should_create_lane_and_add_staging_task', async ({ page }) => {
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Lane Team');

  await addLane(page, teamId, 'Max');
  await addStagingTask(page, teamId, 'Lane Task 1');

  await expect(teamDiv.locator('[data-task-id]')).toBeVisible();
  await expect(page.locator('text=Lane Task 1')).toBeVisible();
});

test('should_support_multiple_lanes', async ({ page }) => {
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Multi Lane');

  await addLane(page, teamId, 'Alice');
  await addLane(page, teamId, 'Bob');

  await expect(teamDiv.locator('[data-lane-id]')).toHaveCount(2);
});

test('should_delete_lane_and_keep_staging_tasks', async ({ page }) => {
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Delete Lane Team');

  await addLane(page, teamId, 'ToDelete');
  await addStagingTask(page, teamId, 'Staging Task');
  await expect(teamDiv.locator('[data-task-id]')).toBeVisible();

  // Delete lane — hover badge to reveal delete button
  const laneId = await teamDiv.locator('[data-lane-id]').first().getAttribute('data-lane-id');
  await teamDiv.locator('[data-testid="lane-name"]').first().hover();
  await page.click(`[data-testid="delete-lane-${laneId}"]`);
  await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
  await page.click('[data-testid="confirm-delete-btn"]');

  await expect(teamDiv.locator('[data-lane-id]')).toHaveCount(0);
  await expect(teamDiv.locator('[data-task-id]')).toHaveCount(1);
});

test('should_persist_lanes_after_reload', async ({ page }) => {
  await setupProject(page);
  const { teamId } = await createSwimlaneTeam(page, 'Lane Persist');

  await addLane(page, teamId, 'Persisted Lane');

  await page.waitForFunction(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('planner_project_'));
    if (!key) return false;
    const project = JSON.parse(localStorage.getItem(key));
    return project.teams?.some(t => t.lanes && t.lanes.length > 0);
  }, { timeout: 5000 });

  await page.reload();
  await page.waitForSelector('[data-team-id]');

  await expect(page.locator('[data-testid="lane-name"]').filter({ hasText: 'Persisted Lane' })).toBeVisible();
});

test('should_add_multiple_staging_tasks', async ({ page }) => {
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Multi Task');

  for (const title of ['Task A', 'Task B', 'Task C']) {
    await addStagingTask(page, teamId, title);
  }

  await expect(teamDiv.locator('[data-task-id]')).toHaveCount(3);
});

test('should_have_4_week_default_duration_for_staging_tasks', async ({ page }) => {
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Duration Team');

  await addStagingTask(page, teamId, 'Four Weeks');
  await teamDiv.locator('[data-task-id]').first().click();
  await expect(page.locator('[data-testid="details-panel-header"]')).toBeVisible();

  await expect(page.locator('[data-testid="details-panel"]')).toContainText('4');
});

test('should_line_up_staging_tasks_without_gaps', async ({ page }) => {
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Lineup Team');

  await addStagingTask(page, teamId, 'First');
  await addStagingTask(page, teamId, 'Second');

  const tasks = teamDiv.locator('[data-staging-row] [data-task-id]');
  await expect(tasks).toHaveCount(2);

  const firstBox = await tasks.nth(0).boundingBox();
  const secondBox = await tasks.nth(1).boundingBox();
  const gap = secondBox.x - (firstBox.x + firstBox.width);
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThan(10);
});

test('should_reorder_staging_tasks_by_dragging', async ({ page }) => {
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Reorder Team');

  for (const name of ['Alpha', 'Beta', 'Gamma']) {
    await addStagingTask(page, teamId, name);
  }

  const stagingRow = teamDiv.locator('[data-staging-row]');
  const tasks = stagingRow.locator('[data-task-id]');
  await expect(tasks).toHaveCount(3);
  await expect(tasks.nth(0)).toContainText('Alpha');

  // Drag Alpha past Beta
  const alphaBox = await tasks.nth(0).boundingBox();
  const betaBox = await tasks.nth(1).boundingBox();
  await page.mouse.move(alphaBox.x + alphaBox.width / 2, alphaBox.y + alphaBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(betaBox.x + betaBox.width * 0.75, betaBox.y + betaBox.height / 2, { steps: 5 });
  await page.mouse.up();

  const reordered = stagingRow.locator('[data-task-id]');
  await expect(reordered.nth(0)).toContainText('Beta');
  await expect(reordered.nth(1)).toContainText('Alpha');
  await expect(reordered.nth(2)).toContainText('Gamma');
});

test('should_open_details_when_swimlane_task_clicked', async ({ page }) => {
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Select Team');

  await addLane(page, teamId, 'QA');
  await addStagingTask(page, teamId, 'Select Task');
  await expect(teamDiv.locator('[data-task-id]')).toBeVisible();

  await teamDiv.locator('[data-task-id]').first().click();

  await expect(page.locator('[data-testid="details-panel-header"]')).toBeVisible();
});

test('should_reset_lane_input_when_clicking_outside', async ({ page }) => {
  // Arrange
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Blur Lane Team');

  // Act
  await page.click(`[data-testid="add-lane-${teamId}"]`);
  await page.fill('[data-testid="lane-name-input"]', 'Should Not Be Created');
  await page.click('body', { position: { x: 10, y: 10 } });

  // Assert
  await expect(page.locator('[data-testid="lane-name-input"]')).toHaveCount(0);
  await expect(teamDiv.locator('[data-lane-id]')).toHaveCount(0);
});

test('should_reset_staging_task_input_when_clicking_outside', async ({ page }) => {
  // Arrange
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Blur Task Team');

  // Act
  await page.click(`[data-testid="add-task-${teamId}"]`);
  await page.fill('[data-testid="task-name-input"]', 'Should Not Be Created');
  await page.click('body', { position: { x: 10, y: 10 } });

  // Assert
  await expect(page.locator('[data-testid="task-name-input"]')).toHaveCount(0);
  await expect(teamDiv.locator('[data-task-id]')).toHaveCount(0);
});

test('should_reorder_lanes_when_dragged_within_team', async ({ page }) => {
  // Arrange
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Reorder Lanes');
  await addLane(page, teamId, 'First Lane');
  await addLane(page, teamId, 'Second Lane');
  await addLane(page, teamId, 'Third Lane');
  await expect(teamDiv.locator('[data-lane-id]')).toHaveCount(3);

  // Get lane IDs in order
  const laneIds = await teamDiv.locator('[data-lane-id]').evaluateAll(els => els.map(el => el.dataset.laneId));
  const firstLaneHandle = page.locator(`[data-testid="lane-drag-handle-${laneIds[0]}"]`);
  const thirdLane = teamDiv.locator(`[data-lane-id="${laneIds[2]}"]`);

  // Act — drag first lane below third lane
  const handleBox = await firstLaneHandle.boundingBox();
  const targetBox = await thirdLane.boundingBox();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height * 0.8, { steps: 10 });
  await page.mouse.up();

  // Assert — First Lane moved past Third Lane, now at the end
  const laneNames = teamDiv.locator('[data-testid="lane-name"]');
  await expect(laneNames.nth(0)).toHaveText('Second Lane');
  await expect(laneNames.nth(1)).toHaveText('Third Lane');
  await expect(laneNames.nth(2)).toHaveText('First Lane');
});

test('should_show_drag_handle_on_lane_badge', async ({ page }) => {
  // Arrange
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Handle Team');
  await addLane(page, teamId, 'Handlebar');

  // Assert
  const laneId = await teamDiv.locator('[data-lane-id]').first().getAttribute('data-lane-id');
  await expect(page.locator(`[data-testid="lane-drag-handle-${laneId}"]`)).toBeVisible();
});

test('should_only_allow_adjacent_lane_task_multiselect', async ({ page }) => {
  await setupProject(page);
  const { teamDiv, teamId } = await createSwimlaneTeam(page, 'Adjacent Team');

  await addLane(page, teamId, 'TestLane');
  for (const name of ['Task1', 'Task2', 'Task3']) {
    await addStagingTask(page, teamId, name);
  }

  // Drag all 3 tasks into the lane
  const laneDiv = teamDiv.locator('[data-lane-id]').first();
  for (let i = 0; i < 3; i++) {
    const stagingTask = teamDiv.locator('[data-staging-row] [data-task-id]').first();
    const sBox = await stagingTask.boundingBox();
    const lBox = await laneDiv.boundingBox();
    await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(lBox.x + 50 + i * 200, lBox.y + lBox.height / 2, { steps: 5 });
    await page.mouse.up();
  }

  const laneTasks = laneDiv.locator('[data-task-id]');
  await expect(laneTasks).toHaveCount(3);

  // Select Task1
  await laneTasks.nth(0).click();

  // Ctrl+click Task3 (non-adjacent)
  await laneTasks.nth(2).click({ modifiers: ['Control'] });

  // Should reset to only Task3
  await expect(laneTasks.nth(2)).toHaveAttribute('aria-selected', 'true');
  await expect(laneTasks.nth(0)).toHaveAttribute('aria-selected', 'false');
});
