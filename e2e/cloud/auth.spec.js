import { test, expect } from '@playwright/test';
import { register, login, openSignIn, uniqueEmail } from './helpers';

test('should_keep_session_after_reload_when_user_registered', async ({ page }) => {
  // Arrange
  await register(page, uniqueEmail('session'), 'Session User');

  // Act
  await page.reload();

  // Assert
  await expect(page.locator('[data-testid="dashboard-new-project"]')).toBeVisible();
});

test('should_sign_in_with_password_when_account_exists', async ({ browser }) => {
  // Arrange
  const email = uniqueEmail('login');
  const signupContext = await browser.newContext();
  await register(await signupContext.newPage(), email, 'Login User');
  await signupContext.close();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Act
  await login(page, email);

  // Assert
  await expect(page.locator('[data-testid="dashboard-new-project"]')).toBeVisible();
  await context.close();
});

test('should_reject_sign_in_when_password_is_wrong', async ({ browser }) => {
  // Arrange
  const email = uniqueEmail('wrongpw');
  const signupContext = await browser.newContext();
  await register(await signupContext.newPage(), email, 'Wrong Password User');
  await signupContext.close();
  const context = await browser.newContext();
  const page = await context.newPage();
  await openSignIn(page);
  await page.fill('[data-testid="auth-email-input"]', email);
  await page.click('[data-testid="auth-submit-btn"]');

  // Act
  await page.fill('[data-testid="auth-password-input"]', 'not-the-password');
  await page.click('[data-testid="auth-login-btn"]');

  // Assert
  await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible();
  await expect(page.locator('[data-testid="dashboard-new-project"]')).toHaveCount(0);
  await context.close();
});
