import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

test('should_keep_local_projects_editable_when_network_is_offline', async ({ page, context }) => {
  // Arrange
  await setupProject(page);

  // Act
  await context.setOffline(true);
  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Offline Task');
  await page.keyboard.press('Enter');

  // Assert
  await expect(page.locator('[data-task-id]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const project = JSON.parse(localStorage.getItem('planner_project_e2e-test'));
    return project.tasks.some((task) => task.title === 'Offline Task');
  })).toBe(true);
});
