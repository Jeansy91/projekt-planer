import { expect } from '@playwright/test';

export const PASSWORD = 'e2e-Password-123';

export const uniqueEmail = (label) =>
  `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

export const openSignIn = async (page) => {
  await page.goto('/');
  await page.click('[data-testid="landing-sign-in-btn"]');
};

export const register = async (page, email, displayName) => {
  await openSignIn(page);
  await page.fill('[data-testid="auth-email-input"]', email);
  await page.click('[data-testid="auth-submit-btn"]');
  await page.fill('[data-testid="auth-display-name-input"]', displayName);
  await page.fill('[data-testid="auth-password-input"]', PASSWORD);
  await page.fill('[data-testid="auth-password-confirm-input"]', PASSWORD);
  await page.click('[data-testid="auth-register-btn"]');
  await expect(page.locator('[data-testid="dashboard-new-project"]')).toBeVisible();
};

export const login = async (page, email) => {
  await openSignIn(page);
  await page.fill('[data-testid="auth-email-input"]', email);
  await page.click('[data-testid="auth-submit-btn"]');
  await page.fill('[data-testid="auth-password-input"]', PASSWORD);
  await page.click('[data-testid="auth-login-btn"]');
  await expect(page.locator('[data-testid="dashboard-new-project"]')).toBeVisible();
};

export const createCloudProject = async (page, title) => {
  await page.click('[data-testid="dashboard-new-project"]');
  await page.click('[data-testid="new-project-cloud"]');
  await page.waitForURL(/\/project\//);
  // The project is read-only until it has finished loading
  await expect(page.locator('[data-testid="add-team-btn"]')).toBeVisible({ timeout: 15000 });
  await page.click('[data-testid="project-title"]');
  await page.fill('[data-testid="project-title-input"]', title);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="project-title"]')).toHaveText(title);
};
