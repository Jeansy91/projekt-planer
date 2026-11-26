import { test, expect } from '@playwright/test';
import { register, createCloudProject, uniqueEmail } from './helpers';

test('should_give_invited_user_access_and_live_updates_when_project_is_shared', async ({ browser }) => {
  test.setTimeout(120000);

  // Arrange
  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const member = await memberContext.newPage();
  const memberEmail = uniqueEmail('member');
  const title = `Shared ${Date.now()}`;
  await test.step('register member', () => register(member, memberEmail, 'Member'));
  await test.step('register owner', () => register(owner, uniqueEmail('owner'), 'Owner'));
  await test.step('create cloud project', () => createCloudProject(owner, title));

  // Act
  await test.step('invite member', async () => {
    await owner.locator('[data-testid="share-btn"]:visible').click();
    await owner.fill('[data-testid="share-email-input"]', memberEmail);
    await owner.click('[data-testid="share-invite-btn"]');
  });

  // Assert
  await test.step('owner sees member in share list', async () => {
    await expect(owner.locator('[data-testid="share-modal"]')).toContainText(memberEmail);
  });

  await test.step('member opens shared project', async () => {
    await member.reload();
    await member.getByRole('button', { name: new RegExp(title) }).first().click();
    await expect(member.locator('[data-testid="project-title"]')).toHaveText(title);
  });

  await test.step('member receives live rename', async () => {
    await owner.click('[data-testid="share-close-btn"]');
    await owner.click('[data-testid="project-title"]');
    await owner.fill('[data-testid="project-title-input"]', `${title} renamed`);
    await owner.keyboard.press('Enter');
    await expect(member.locator('[data-testid="project-title"]')).toHaveText(`${title} renamed`, { timeout: 15000 });
  });

  await ownerContext.close();
  await memberContext.close();
});

test('should_persist_title_when_renamed_while_project_is_still_loading', async ({ browser }) => {
  test.setTimeout(120000);

  // Arrange: slow down the last request of the project boot so the rename
  // lands before the project id is applied to the sync layer
  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const member = await memberContext.newPage();
  const memberEmail = uniqueEmail('member');
  const title = `Renamed ${Date.now()}`;
  await test.step('register member', () => register(member, memberEmail, 'Member'));
  await test.step('register owner', () => register(owner, uniqueEmail('owner'), 'Owner'));
  await owner.route('**/rest/v1/user_project_settings*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });

  // Act: create, rename while loading, then share without any artificial wait
  await test.step('rename while project is loading', async () => {
    await owner.click('[data-testid="dashboard-new-project"]');
    await owner.click('[data-testid="new-project-cloud"]');
    await owner.waitForURL(/\/project\//);
    await owner.click('[data-testid="project-title"]');
    await owner.fill('[data-testid="project-title-input"]', title);
    await owner.keyboard.press('Enter');
  });
  await test.step('invite member', async () => {
    await owner.locator('[data-testid="share-btn"]:visible').click();
    await owner.fill('[data-testid="share-email-input"]', memberEmail);
    await owner.click('[data-testid="share-invite-btn"]');
    await expect(owner.locator('[data-testid="share-modal"]')).toContainText(memberEmail);
  });

  // Assert: the title reached the database, so fresh page loads show it
  await test.step('member sees the new title', async () => {
    await member.reload();
    await expect(member.getByRole('button', { name: new RegExp(title) }).first()).toBeVisible({ timeout: 15000 });
  });
  await test.step('owner keeps the new title after reload', async () => {
    await owner.reload();
    await expect(owner.locator('[data-testid="project-title"]')).toHaveText(title);
  });

  await ownerContext.close();
  await memberContext.close();
});
