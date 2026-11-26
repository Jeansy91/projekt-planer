import { test, expect } from '@playwright/test';
import { register, createCloudProject, uniqueEmail } from './helpers';

test('should_give_invited_user_access_and_live_updates_when_project_is_shared', async ({ browser }) => {
  // Arrange
  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const member = await memberContext.newPage();
  const memberEmail = uniqueEmail('member');
  const title = `Shared ${Date.now()}`;
  await register(member, memberEmail, 'Member');
  await register(owner, uniqueEmail('owner'), 'Owner');
  await createCloudProject(owner, title);

  // Act
  await owner.click('[data-testid="main-menu-btn"]');
  await owner.click('[data-testid="share-btn"]');
  await owner.fill('[data-testid="share-email-input"]', memberEmail);
  await owner.click('[data-testid="share-invite-btn"]');

  // Assert
  await expect(owner.locator('[data-testid="share-modal"]')).toContainText(memberEmail);

  await member.reload();
  await member.getByRole('button', { name: new RegExp(title) }).first().click();
  await expect(member.locator('[data-testid="project-title"]')).toHaveText(title);

  await owner.click('[data-testid="share-close-btn"]');
  await owner.click('[data-testid="project-title"]');
  await owner.fill('[data-testid="project-title-input"]', `${title} renamed`);
  await owner.keyboard.press('Enter');
  await expect(member.locator('[data-testid="project-title"]')).toHaveText(`${title} renamed`, { timeout: 15000 });

  await ownerContext.close();
  await memberContext.close();
});
