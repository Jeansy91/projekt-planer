import { test, expect } from '@playwright/test';

// -- Helpers (file-local) -----------------------------------------------------

async function injectProject(page) {
  await page.evaluate(() => {
    const id = 'delete-test-project';
    const data = { id, title: 'Project To Delete', teams: [], tasks: [], viewStartDate: new Date().toISOString(), weeksShown: 12 };
    localStorage.setItem(`planner_project_${id}`, JSON.stringify(data));
    const list = JSON.parse(localStorage.getItem('planner_projects_list') || '[]');
    list.push({ id, title: data.title, lastModified: new Date().toISOString() });
    localStorage.setItem('planner_projects_list', JSON.stringify(list));
  });
}

// -- Tests --------------------------------------------------------------------

test('should_keep_project_when_delete_cancelled', async ({ page }) => {
  await page.goto('/');
  await injectProject(page);
  await page.reload();

  await page.click('[data-testid="landing-open-project"]');
  const deleteBtn = page.locator('[data-testid="delete-project-delete-test-project"]');
  await deleteBtn.waitFor({ state: 'attached' });
  await deleteBtn.click({ force: true });

  const modal = page.locator('[data-testid="confirm-modal"]');
  await expect(modal).toBeVisible();

  await page.click('[data-testid="confirm-cancel-btn"]');

  await expect(modal).not.toBeVisible();
  await expect(page.locator('text=Project To Delete')).toBeVisible();
});

test('should_remove_project_when_delete_confirmed', async ({ page }) => {
  await page.goto('/');
  await injectProject(page);
  await page.reload();

  await page.click('[data-testid="landing-open-project"]');
  const deleteBtn = page.locator('[data-testid="delete-project-delete-test-project"]');
  await deleteBtn.waitFor({ state: 'attached' });
  await deleteBtn.click({ force: true });

  await expect(page.locator('[data-testid="confirm-modal"]')).toBeVisible();
  await page.click('[data-testid="confirm-delete-btn"]');

  await expect(page.locator('text=Project To Delete')).not.toBeVisible();

  const exists = await page.evaluate(() => {
    return localStorage.getItem('planner_project_delete-test-project') !== null;
  });
  expect(exists).toBe(false);
});
