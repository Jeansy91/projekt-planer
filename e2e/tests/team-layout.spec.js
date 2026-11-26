import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers';

// -- Helpers (file-local) -----------------------------------------------------

async function createTeam(page, name) {
  await page.click('[data-testid="add-team-btn"]');
  await page.fill('[data-testid="add-team-input"]', name);
  await page.keyboard.press('Enter');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

// -- Tests --------------------------------------------------------------------

test('should_show_border_on_all_team_headers', async ({ page }) => {
  await setupProject(page);
  await createTeam(page, 'Alpha');
  await createTeam(page, 'Beta');

  const teamDivs = page.locator('[data-team-id]');
  await expect(teamDivs).toHaveCount(3);

  // Each team header has a visible border via rounded-lg border class
  for (let i = 0; i < 3; i++) {
    const headerBorder = await teamDivs.nth(i).locator('.sticky').evaluate(
      el => window.getComputedStyle(el).borderWidth
    );
    expect(headerBorder).not.toBe('0px');
  }
});

test('should_maintain_gap_between_header_and_tasks', async ({ page }) => {
  await setupProject(page);

  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Gap Task');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');

  const gaps = await page.evaluate(() => {
    const teamEl = document.querySelector('[data-team-id]');
    const taskContainer = Array.from(teamEl.querySelectorAll('div')).find(
      div => window.getComputedStyle(div).marginTop === '8px' && window.getComputedStyle(div).position === 'relative',
    );
    const teamHeader = teamEl.querySelector('.flex.items-center.gap-2');
    if (!teamHeader || !taskContainer) return null;

    const headerRect = teamHeader.getBoundingClientRect();
    const containerRect = taskContainer.getBoundingClientRect();
    return { topGap: containerRect.top - (headerRect.top + headerRect.height) };
  });

  expect(gaps).toBeDefined();
  expect(gaps.topGap).toBeGreaterThanOrEqual(6);
  expect(gaps.topGap).toBeLessThanOrEqual(16);
});

test('should_keep_team_header_border_while_dragging', async ({ page }) => {
  await setupProject(page);
  await createTeam(page, 'Other');

  await page.click('[data-testid="add-task-null"]');
  await page.fill('[data-testid="task-name-input"]', 'Task A');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-task-id]');

  const firstTeamHeader = page.locator('[data-team-id]').first().locator('.sticky');
  const initialBorder = await firstTeamHeader.evaluate(el => window.getComputedStyle(el).borderWidth);
  expect(initialBorder).not.toBe('0px');

  // Start dragging
  const task = page.locator('[data-task-id]').first();
  const taskBox = await task.boundingBox();
  await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + 100, { steps: 5 });

  const borderWhileDragging = await firstTeamHeader.evaluate(el => window.getComputedStyle(el).borderWidth);
  expect(borderWhileDragging).not.toBe('0px');

  await page.mouse.up();
});

test('should_show_add_team_button_outside_scroll_area', async ({ page }) => {
  await setupProject(page);

  const btn = page.locator('[data-testid="add-team-btn"]');
  await expect(btn).toBeVisible();

  const layout = await page.evaluate(() => {
    const scrollContainer = document.querySelector('[data-testid="calendar-grid"]');
    const button = document.querySelector('[data-testid="add-team-btn"]');
    if (!scrollContainer || !button) return null;
    return {
      scrollBottom: scrollContainer.getBoundingClientRect().bottom,
      btnTop: button.getBoundingClientRect().top,
    };
  });

  expect(layout.btnTop).toBeGreaterThanOrEqual(layout.scrollBottom - 1);
});

test('should_keep_add_team_button_visible_when_many_tasks_cause_scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await setupProject(page);

  for (let i = 0; i < 15; i++) {
    await page.click('[data-testid="add-task-null"]');
    await page.fill('[data-testid="task-name-input"]', `Task ${i + 1}`);
    await page.keyboard.press('Enter');
  }
  await page.waitForSelector('[data-task-id]');
  await expect(page.locator('[data-task-id]')).toHaveCount(15);

  const btn = page.locator('[data-testid="add-team-btn"]');
  await expect(btn).toBeVisible();

  // Scroll to bottom — button should still be visible
  await page.evaluate(() => {
    document.querySelector('[data-testid="calendar-grid"]').scrollTop = 99999;
  });
  await expect(btn).toBeVisible();
});

test('should_style_unassigned_group_subtly', async ({ page }) => {
  await setupProject(page);
  await createTeam(page, 'Real Team');

  const unassignedHeader = page.locator('[data-team-id="null"] [data-testid="team-name"]');
  const unassignedStyles = await unassignedHeader.evaluate(el => ({
    fontStyle: window.getComputedStyle(el).fontStyle,
    fontWeight: window.getComputedStyle(el).fontWeight,
  }));
  expect(unassignedStyles.fontStyle).toBe('italic');

  const realHeader = page.locator('[data-team-id]').nth(0).locator('[data-testid="team-name"]');
  const realStyles = await realHeader.evaluate(el => ({
    fontStyle: window.getComputedStyle(el).fontStyle,
    fontWeight: window.getComputedStyle(el).fontWeight,
  }));
  expect(realStyles.fontStyle).toBe('normal');
  expect(Number(realStyles.fontWeight)).toBeGreaterThan(Number(unassignedStyles.fontWeight));
});
