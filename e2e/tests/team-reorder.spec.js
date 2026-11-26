import { test, expect } from '@playwright/test';
import de from '../../src/locales/de.json' with { type: 'json' };
import { setupProject } from '../helpers';

// -- Helpers (file-local) -----------------------------------------------------

async function createTeam(page, name) {
  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', name);
  await page.keyboard.press('Enter');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

async function getTeamNames(page) {
  const teamDivs = page.locator('[data-team-id]');
  const count = await teamDivs.count();
  const names = [];
  for (let i = 0; i < count; i++) {
    const text = await teamDivs.nth(i).locator('[data-testid="team-name"]').textContent();
    names.push(text.trim());
  }
  return names;
}

// -- Tests --------------------------------------------------------------------

test('should_reorder_teams_when_up_down_buttons_clicked', async ({ page }) => {
  await setupProject(page);
  await createTeam(page, 'Alpha');
  await createTeam(page, 'Beta');

  expect(await getTeamNames(page)).toEqual(['Alpha', 'Beta', de.teams.unassigned]);

  // Move Beta up
  const betaTeamId = await page.locator('[data-team-id]').nth(1).getAttribute('data-team-id');
  await page.locator(`[data-testid="team-up-${betaTeamId}"]`).click();
  expect(await getTeamNames(page)).toEqual(['Beta', 'Alpha', de.teams.unassigned]);

  // Move Beta down again
  await page.locator(`[data-testid="team-down-${betaTeamId}"]`).click();
  expect(await getTeamNames(page)).toEqual(['Alpha', 'Beta', de.teams.unassigned]);
});

test('should_disable_up_for_first_and_down_for_last_team', async ({ page }) => {
  await setupProject(page);
  await createTeam(page, 'First');
  await createTeam(page, 'Last');

  const teamDivs = page.locator('[data-team-id]');
  const firstTeamId = await teamDivs.nth(0).getAttribute('data-team-id');
  const lastTeamId = await teamDivs.nth(1).getAttribute('data-team-id');

  // First team: up disabled, down enabled
  await expect(page.locator(`[data-testid="team-up-${firstTeamId}"]`)).toBeDisabled();
  await expect(page.locator(`[data-testid="team-down-${firstTeamId}"]`)).toBeEnabled();

  // Last team: up enabled, down disabled
  await expect(page.locator(`[data-testid="team-up-${lastTeamId}"]`)).toBeEnabled();
  await expect(page.locator(`[data-testid="team-down-${lastTeamId}"]`)).toBeDisabled();
});

test('should_disable_both_buttons_when_single_team', async ({ page }) => {
  await setupProject(page);
  await createTeam(page, 'Solo');

  const teamId = await page.locator('[data-team-id]').nth(0).getAttribute('data-team-id');

  await expect(page.locator(`[data-testid="team-up-${teamId}"]`)).toBeDisabled();
  await expect(page.locator(`[data-testid="team-down-${teamId}"]`)).toBeDisabled();
});
