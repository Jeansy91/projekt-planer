import { chromium } from 'playwright';

const VIEWPORT = { width: 1440, height: 900 };

function getMonday(weeksFromNow = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 + weeksFromNow * 7);
  return d.toISOString().slice(0, 10);
}

// ── Per-screenshot project data ──

function ganttProject() {
  return {
    id: 'ss-gantt',
    title: 'Website Relaunch 2026',
    unassignedGroupCollapsed: true,
    viewStartDate: getMonday(-1),
    weeksShown: 16,
    density: 0,
    teams: [
      { id: 'g1', name: 'Design', collapsed: false, viewMode: 'gantt', lanes: [] },
      { id: 'g2', name: 'Development', collapsed: false, viewMode: 'gantt', lanes: [] },
      { id: 'g3', name: 'Marketing', collapsed: false, viewMode: 'gantt', lanes: [] },
    ],
    tasks: [
      { id: 'gt1', title: 'Wireframes erstellen', startDate: getMonday(0), duration: 2, teamId: 'g1', laneId: null, color: 'blue', notes: '' },
      { id: 'gt2', title: 'UI Mockups', startDate: getMonday(2), duration: 3, teamId: 'g1', laneId: null, color: 'purple', notes: '' },
      { id: 'gt3', title: 'Design Review', startDate: getMonday(5), duration: 1, teamId: 'g1', laneId: null, color: 'emerald', notes: '' },
      { id: 'gt4', title: 'Frontend Setup', startDate: getMonday(1), duration: 2, teamId: 'g2', laneId: null, color: 'blue', notes: '' },
      { id: 'gt5', title: 'API Development', startDate: getMonday(3), duration: 4, teamId: 'g2', laneId: null, color: 'amber', notes: '' },
      { id: 'gt6', title: 'Testing & QA', startDate: getMonday(7), duration: 2, teamId: 'g2', laneId: null, color: 'rose', notes: '' },
      { id: 'gt7', title: 'Performance Optimierung', startDate: getMonday(5), duration: 2, teamId: 'g2', laneId: null, color: 'purple', notes: '' },
      { id: 'gt8', title: 'Content Strategie', startDate: getMonday(2), duration: 3, teamId: 'g3', laneId: null, color: 'emerald', notes: '' },
      { id: 'gt9', title: 'Social Media Plan', startDate: getMonday(5), duration: 2, teamId: 'g3', laneId: null, color: 'amber', notes: '' },
      { id: 'gt10', title: 'Launch Kampagne', startDate: getMonday(7), duration: 2, teamId: 'g3', laneId: null, color: 'rose', notes: '' },
    ],
  };
}

function swimlaneProject() {
  return {
    id: 'ss-swimlane',
    title: 'Sprint Board Q2',
    unassignedGroupCollapsed: true,
    viewStartDate: getMonday(-1),
    weeksShown: 12,
    density: 0,
    teams: [
      {
        id: 'sw1', name: 'Backend Team', collapsed: false, viewMode: 'swimlane',
        lanes: [
          { id: 'lane1', name: 'In Progress' },
          { id: 'lane2', name: 'Review' },
          { id: 'lane3', name: 'Done' },
        ],
      },
      {
        id: 'sw2', name: 'Frontend Team', collapsed: false, viewMode: 'swimlane',
        lanes: [
          { id: 'lane4', name: 'In Progress' },
          { id: 'lane5', name: 'Done' },
        ],
      },
    ],
    tasks: [
      { id: 'st1', title: 'Auth Service', startDate: getMonday(0), duration: 3, teamId: 'sw1', laneId: 'lane1', color: 'blue', notes: '' },
      { id: 'st2', title: 'Database Migration', startDate: getMonday(3), duration: 2, teamId: 'sw1', laneId: 'lane1', color: 'amber', notes: '' },
      { id: 'st3', title: 'API Refactoring', startDate: getMonday(0), duration: 2, teamId: 'sw1', laneId: 'lane2', color: 'purple', notes: '' },
      { id: 'st4', title: 'Unit Tests', startDate: getMonday(2), duration: 1, teamId: 'sw1', laneId: 'lane2', color: 'emerald', notes: '' },
      { id: 'st5', title: 'Caching Layer', startDate: getMonday(0), duration: 2, teamId: 'sw1', laneId: 'lane3', color: 'rose', notes: '' },
      { id: 'st6', title: 'Dashboard UI', startDate: getMonday(0), duration: 3, teamId: 'sw2', laneId: 'lane4', color: 'blue', notes: '' },
      { id: 'st7', title: 'Form Validation', startDate: getMonday(3), duration: 2, teamId: 'sw2', laneId: 'lane4', color: 'purple', notes: '' },
      { id: 'st8', title: 'Login Page', startDate: getMonday(0), duration: 2, teamId: 'sw2', laneId: 'lane5', color: 'emerald', notes: '' },
      { id: 'st9', title: 'Navigation Redesign', startDate: getMonday(2), duration: 2, teamId: 'sw2', laneId: 'lane5', color: 'amber', notes: '' },
    ],
  };
}

function importExportProject() {
  return {
    id: 'ss-import',
    title: 'Marketing Campaign Q3',
    unassignedGroupCollapsed: true,
    viewStartDate: getMonday(-1),
    weeksShown: 16,
    density: 0,
    teams: [
      { id: 'ie1', name: 'Strategie', collapsed: false, viewMode: 'gantt', lanes: [] },
      { id: 'ie2', name: 'Kreation', collapsed: false, viewMode: 'gantt', lanes: [] },
      { id: 'ie3', name: 'Medien', collapsed: false, viewMode: 'gantt', lanes: [] },
    ],
    tasks: [
      { id: 'it1', title: 'Marktanalyse', startDate: getMonday(0), duration: 3, teamId: 'ie1', laneId: null, color: 'cyan', notes: '' },
      { id: 'it2', title: 'Zielgruppenrecherche', startDate: getMonday(3), duration: 2, teamId: 'ie1', laneId: null, color: 'violet', notes: '' },
      { id: 'it3', title: 'Budgetplanung', startDate: getMonday(5), duration: 2, teamId: 'ie1', laneId: null, color: 'amber', notes: '' },
      { id: 'it4', title: 'Key Visuals', startDate: getMonday(1), duration: 3, teamId: 'ie2', laneId: null, color: 'fuchsia', notes: '' },
      { id: 'it5', title: 'Video Produktion', startDate: getMonday(4), duration: 4, teamId: 'ie2', laneId: null, color: 'rose', notes: '' },
      { id: 'it6', title: 'Copywriting', startDate: getMonday(2), duration: 2, teamId: 'ie2', laneId: null, color: 'blue', notes: '' },
      { id: 'it7', title: 'Social Ads Setup', startDate: getMonday(6), duration: 3, teamId: 'ie3', laneId: null, color: 'emerald', notes: '' },
      { id: 'it8', title: 'Print Verteilung', startDate: getMonday(3), duration: 2, teamId: 'ie3', laneId: null, color: 'orange', notes: '' },
      { id: 'it9', title: 'TV Spot Booking', startDate: getMonday(5), duration: 3, teamId: 'ie3', laneId: null, color: 'yellow', notes: '' },
    ],
  };
}

function cloudCollabProject() {
  return {
    id: 'ss-cloud',
    title: 'Mobile App Launch',
    unassignedGroupCollapsed: true,
    viewStartDate: getMonday(-1),
    weeksShown: 16,
    density: 0,
    teams: [
      { id: 'cc1', name: 'iOS Team', collapsed: false, viewMode: 'gantt', lanes: [] },
      { id: 'cc2', name: 'Android Team', collapsed: false, viewMode: 'gantt', lanes: [] },
      { id: 'cc3', name: 'Release', collapsed: false, viewMode: 'gantt', lanes: [] },
    ],
    tasks: [
      { id: 'ct1', title: 'SwiftUI Setup', startDate: getMonday(0), duration: 2, teamId: 'cc1', laneId: null, color: 'blue', notes: '' },
      { id: 'ct2', title: 'Core Features', startDate: getMonday(2), duration: 4, teamId: 'cc1', laneId: null, color: 'violet', notes: '' },
      { id: 'ct3', title: 'Push Notifications', startDate: getMonday(6), duration: 2, teamId: 'cc1', laneId: null, color: 'amber', notes: '' },
      { id: 'ct4', title: 'Kotlin Migration', startDate: getMonday(1), duration: 3, teamId: 'cc2', laneId: null, color: 'emerald', notes: '' },
      { id: 'ct5', title: 'Material Design', startDate: getMonday(4), duration: 3, teamId: 'cc2', laneId: null, color: 'fuchsia', notes: '' },
      { id: 'ct6', title: 'Offline Sync', startDate: getMonday(7), duration: 2, teamId: 'cc2', laneId: null, color: 'rose', notes: '' },
      { id: 'ct7', title: 'App Store Review', startDate: getMonday(8), duration: 2, teamId: 'cc3', laneId: null, color: 'cyan', notes: '' },
      { id: 'ct8', title: 'Beta Rollout', startDate: getMonday(5), duration: 3, teamId: 'cc3', laneId: null, color: 'orange', notes: '' },
      { id: 'ct9', title: 'Launch Event', startDate: getMonday(10), duration: 1, teamId: 'cc3', laneId: null, color: 'yellow', notes: '' },
    ],
  };
}

function heroProject() {
  return {
    id: 'ss-hero',
    title: 'E-Commerce Platform 2026',
    unassignedGroupCollapsed: true,
    viewStartDate: getMonday(-1),
    weeksShown: 16,
    density: 0,
    teams: [
      { id: 'h1', name: 'UX Research', collapsed: false, viewMode: 'gantt', lanes: [] },
      { id: 'h2', name: 'Engineering', collapsed: false, viewMode: 'gantt', lanes: [] },
      {
        id: 'h3', name: 'QA & Release', collapsed: false, viewMode: 'swimlane',
        lanes: [
          { id: 'hl1', name: 'Testing' },
          { id: 'hl2', name: 'Staging' },
          { id: 'hl3', name: 'Released' },
        ],
      },
    ],
    tasks: [
      // UX Research (gantt)
      { id: 'ht1', title: 'User Interviews', startDate: getMonday(0), duration: 3, teamId: 'h1', laneId: null, color: 'violet', notes: '' },
      { id: 'ht2', title: 'Prototyping', startDate: getMonday(3), duration: 2, teamId: 'h1', laneId: null, color: 'fuchsia', notes: '' },
      { id: 'ht3', title: 'Usability Testing', startDate: getMonday(5), duration: 2, teamId: 'h1', laneId: null, color: 'cyan', notes: '' },
      // Engineering (gantt)
      { id: 'ht4', title: 'Checkout Flow', startDate: getMonday(1), duration: 4, teamId: 'h2', laneId: null, color: 'blue', notes: '' },
      { id: 'ht5', title: 'Payment Gateway', startDate: getMonday(5), duration: 3, teamId: 'h2', laneId: null, color: 'emerald', notes: '' },
      { id: 'ht6', title: 'Search & Filters', startDate: getMonday(3), duration: 2, teamId: 'h2', laneId: null, color: 'amber', notes: '' },
      { id: 'ht7', title: 'Performance Monitoring', startDate: getMonday(8), duration: 2, teamId: 'h2', laneId: null, color: 'rose', notes: '' },
      // QA & Release (swimlane)
      { id: 'ht8', title: 'Integration Tests', startDate: getMonday(2), duration: 3, teamId: 'h3', laneId: 'hl1', color: 'orange', notes: '' },
      { id: 'ht9', title: 'Load Testing', startDate: getMonday(5), duration: 2, teamId: 'h3', laneId: 'hl1', color: 'yellow', notes: '' },
      { id: 'ht10', title: 'Beta Deploy', startDate: getMonday(3), duration: 2, teamId: 'h3', laneId: 'hl2', color: 'blue', notes: '' },
      { id: 'ht11', title: 'v1.0 Release', startDate: getMonday(7), duration: 1, teamId: 'h3', laneId: 'hl3', color: 'emerald', notes: '' },
    ],
  };
}

function splitProject() {
  return {
    id: 'ss-split',
    title: 'Product Launch 2026',
    unassignedGroupCollapsed: true,
    viewStartDate: getMonday(-1),
    weeksShown: 16,
    density: 0,
    teams: [
      { id: 'ds', name: 'Design', collapsed: false, viewMode: 'gantt', lanes: [] },
      { id: 'fe', name: 'Frontend', collapsed: false, viewMode: 'gantt', lanes: [] },
      { id: 'be', name: 'Backend', collapsed: false, viewMode: 'gantt', lanes: [] },
      { id: 'qa', name: 'QA & Launch', collapsed: false, viewMode: 'gantt', lanes: [] },
    ],
    tasks: [
      { id: 's1', title: 'Research & Concept', startDate: getMonday(0), duration: 3, teamId: 'ds', laneId: null, color: 'blue', notes: '' },
      { id: 's2', title: 'Wireframes', startDate: getMonday(3), duration: 2, teamId: 'ds', laneId: null, color: 'violet', notes: '' },
      { id: 's3', title: 'Visual Design', startDate: getMonday(5), duration: 3, teamId: 'ds', laneId: null, color: 'fuchsia', notes: '' },
      { id: 's4', title: 'Design Review', startDate: getMonday(8), duration: 2, teamId: 'ds', laneId: null, color: 'emerald', notes: '' },
      { id: 's5', title: 'Project Setup', startDate: getMonday(2), duration: 2, teamId: 'fe', laneId: null, color: 'cyan', notes: '' },
      { id: 's6', title: 'Component Library', startDate: getMonday(4), duration: 4, teamId: 'fe', laneId: null, color: 'blue', notes: '' },
      { id: 's7', title: 'Page Integration', startDate: getMonday(8), duration: 3, teamId: 'fe', laneId: null, color: 'orange', notes: '' },
      { id: 's8', title: 'Animations & Polish', startDate: getMonday(11), duration: 3, teamId: 'fe', laneId: null, color: 'violet', notes: '' },
      { id: 's9', title: 'API Architecture', startDate: getMonday(1), duration: 3, teamId: 'be', laneId: null, color: 'emerald', notes: '' },
      { id: 's10', title: 'Database Schema', startDate: getMonday(4), duration: 2, teamId: 'be', laneId: null, color: 'yellow', notes: '' },
      { id: 's11', title: 'Core Services', startDate: getMonday(6), duration: 4, teamId: 'be', laneId: null, color: 'rose', notes: '' },
      { id: 's12', title: 'Auth & Security', startDate: getMonday(10), duration: 3, teamId: 'be', laneId: null, color: 'blue', notes: '' },
      { id: 's13', title: 'Test Planning', startDate: getMonday(6), duration: 2, teamId: 'qa', laneId: null, color: 'orange', notes: '' },
      { id: 's14', title: 'Integration Tests', startDate: getMonday(8), duration: 3, teamId: 'qa', laneId: null, color: 'emerald', notes: '' },
      { id: 's15', title: 'Performance Audit', startDate: getMonday(11), duration: 2, teamId: 'qa', laneId: null, color: 'rose', notes: '' },
      { id: 's16', title: 'Launch Preparation', startDate: getMonday(13), duration: 2, teamId: 'qa', laneId: null, color: 'fuchsia', notes: '' },
    ],
  };
}

// ── DOM manipulation helpers ──

function injectFileBadge(isDark) {
  const fileCheckSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="m9 15 2 2 4-4"></path></svg>';
  const header = document.querySelector('header');
  if (!header) return;
  const row2 = header.children[1];
  if (!row2) return;
  const badge = row2.firstElementChild;
  if (badge) {
    badge.className = `flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md w-fit ${isDark ? 'bg-emerald-800/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`;
    badge.innerHTML = `${fileCheckSvg} marketing-q3.json`;
  }
}

function injectCloudUI(isDark) {
  const svg = {
    cloud: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg>',
    share: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"></line><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"></line></svg>',
    chevron: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><path d="m6 9 6 6 6-6"></path></svg>',
  };

  const header = document.querySelector('header');
  if (!header) return;

  const row2 = header.children[1];
  if (!row2) return;
  const badge = row2.firstElementChild;
  if (badge) {
    badge.className = `flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md w-fit ${isDark ? 'bg-purple-800/30 text-purple-300' : 'bg-purple-100 text-purple-700'}`;
    badge.innerHTML = `${svg.cloud} Cloud (a1b2c3d4)`;
  }

  const members = [
    { initials: 'LS', bg: 'bg-emerald-500' },
    { initials: 'MK', bg: 'bg-purple-500' },
    { initials: 'TR', bg: 'bg-orange-500' },
  ];
  const ringColor = isDark ? 'ring-slate-800' : 'ring-white';
  const membersHtml = members.map(m =>
    `<div class="w-5 h-5 rounded-full ${m.bg} flex items-center justify-center text-[9px] font-bold text-white ring-1 ${ringColor}" title="${m.initials}">${m.initials}</div>`
  ).join('');
  const memberEl = document.createElement('div');
  memberEl.className = `flex items-center gap-1.5 text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`;
  memberEl.innerHTML = `<div class="flex -space-x-1.5">${membersHtml}</div><span>3 active</span>`;
  row2.appendChild(memberEl);

  const row1 = header.children[0];
  if (!row1) return;

  const allDivs = row1.querySelectorAll('div');
  let actionsContainer = null;
  for (const d of allDivs) {
    if (d.classList.contains('hidden') && d.classList.contains('md:flex')) {
      actionsContainer = d;
      break;
    }
  }
  if (actionsContainer) {
    const shareBtn = document.createElement('button');
    shareBtn.className = `h-8 flex items-center gap-1.5 px-2.5 border rounded-lg text-xs font-semibold shadow-sm ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`;
    shareBtn.innerHTML = `<span class="${isDark ? 'text-slate-500' : 'text-slate-400'}">${svg.share}</span><span class="hidden lg:inline">Share</span>`;
    actionsContainer.insertBefore(shareBtn, actionsContainer.firstChild);
  }

  const existingAuthBtn = row1.querySelector('[data-testid="auth-btn"]');
  if (existingAuthBtn) {
    const authWrapper = existingAuthBtn.closest('.shrink-0') || existingAuthBtn.parentElement;
    authWrapper.remove();
  }

  const accountEl = document.createElement('div');
  accountEl.className = 'relative shrink-0';
  accountEl.innerHTML = `
    <button class="h-8 flex items-center gap-1.5 pl-1.5 pr-2.5 border rounded-lg shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
      <span class="w-5 h-5 rounded-full ${isDark ? 'bg-blue-800/30' : 'bg-blue-100'} flex items-center justify-center text-[10px] font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}">A</span>
      <span class="text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} hidden sm:inline">Alex</span>
      ${svg.chevron}
    </button>
  `;
  row1.appendChild(accountEl);
}

// ── Screenshot helpers ──

async function navigateAndWait(page, url) {
  await page.goto(url);
  await page.waitForSelector('[data-task-id]', { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.mouse.click(10, 10);
  await page.waitForTimeout(200);
}

async function seedProject(page, data) {
  await page.evaluate((d) => {
    localStorage.setItem(`planner_project_${d.id}`, JSON.stringify(d));
    const list = JSON.parse(localStorage.getItem('planner_projects_list') || '[]');
    if (!list.find(p => p.id === d.id)) list.push({ id: d.id, title: d.title, lastModified: new Date().toISOString() });
    localStorage.setItem('planner_projects_list', JSON.stringify(list));
  }, data);
}

async function takeScreenshot(page, path, label, counter) {
  await page.screenshot({ path, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  console.log(`${counter[0]++}. ${path.split('/').pop()} (${label})`);
}

async function main() {
  const projects = {
    hero: heroProject(),
    gantt: ganttProject(),
    swimlane: swimlaneProject(),
    importExport: importExportProject(),
    cloud: cloudCollabProject(),
    split: splitProject(),
  };
  const allIds = Object.values(projects).map(p => p.id);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();

  // Seed all projects
  await page.goto('http://localhost:5173');
  for (const data of Object.values(projects)) {
    await seedProject(page, data);
  }

  const counter = [1];

  for (const isDark of [false, true]) {
    const suffix = isDark ? '-dark' : '';
    const mode = isDark ? 'dark' : 'light';
    await page.evaluate((t) => localStorage.setItem('user_theme', t), mode);

    // 0: Hero
    await navigateAndWait(page, `http://localhost:5173/project/${projects.hero.id}`);
    await takeScreenshot(page, `public/screenshots/hero${suffix}.png`, mode, counter);

    // 1: Gantt overview
    await navigateAndWait(page, `http://localhost:5173/project/${projects.gantt.id}`);
    await takeScreenshot(page, `public/screenshots/gantt-overview${suffix}.png`, mode, counter);

    // 2: Swimlane view
    await navigateAndWait(page, `http://localhost:5173/project/${projects.swimlane.id}`);
    await takeScreenshot(page, `public/screenshots/swimlane-view${suffix}.png`, mode, counter);

    // 3: Import/export (file badge)
    await navigateAndWait(page, `http://localhost:5173/project/${projects.importExport.id}`);
    await page.evaluate(injectFileBadge, isDark);
    await page.waitForTimeout(100);
    await takeScreenshot(page, `public/screenshots/import-export${suffix}.png`, mode, counter);

    // 4: Cloud collaboration
    await navigateAndWait(page, `http://localhost:5173/project/${projects.cloud.id}`);
    await page.evaluate(injectCloudUI, isDark);
    await page.waitForTimeout(200);
    await takeScreenshot(page, `public/screenshots/cloud-collab${suffix}.png`, mode, counter);
  }

  // ── Dark mode split pair ──
  await page.evaluate(() => localStorage.setItem('user_theme', 'light'));
  await navigateAndWait(page, `http://localhost:5173/project/${projects.split.id}`);
  await takeScreenshot(page, 'public/screenshots/dark-mode-light.png', 'split-light', counter);

  await page.evaluate(() => localStorage.setItem('user_theme', 'dark'));
  await navigateAndWait(page, `http://localhost:5173/project/${projects.split.id}`);
  await takeScreenshot(page, 'public/screenshots/dark-mode-dark.png', 'split-dark', counter);

  // ── Images for the user guide (docs/images) ──
  await page.evaluate(() => localStorage.setItem('user_theme', 'light'));
  await navigateAndWait(page, `http://localhost:5173/project/${projects.gantt.id}`);
  await page.locator('[data-task-id]').first().click();
  await page.waitForSelector('[data-testid="details-panel"]');
  await takeScreenshot(page, 'docs/images/gantt-details.png', 'details', counter);

  await navigateAndWait(page, `http://localhost:5173/project/${projects.gantt.id}`);
  await takeScreenshot(page, 'docs/images/gantt.png', 'gantt', counter);

  await page.locator('[data-testid="info-btn"]:visible').first().click();
  await page.waitForSelector('[data-testid="info-modal"]');
  await takeScreenshot(page, 'docs/images/shortcuts.png', 'info dialog', counter);

  // Cleanup
  await page.evaluate((ids) => {
    localStorage.removeItem('user_theme');
    for (const id of ids) localStorage.removeItem(`planner_project_${id}`);
    const list = JSON.parse(localStorage.getItem('planner_projects_list') || '[]');
    localStorage.setItem('planner_projects_list', JSON.stringify(list.filter(p => !ids.includes(p.id))));
  }, allIds);

  console.log('All screenshots saved to public/screenshots/ and docs/images/');
  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
