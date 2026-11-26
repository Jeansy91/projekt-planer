/** @type {import('@playwright/test').PlaywrightTestConfig} */
export default {
  timeout: 30000,
  retries: process.env.CI ? 2 : 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
    locale: 'de-DE',
    browserName: 'chromium',
  },
  projects: [
    // Local projects only, no Supabase needed
    { name: 'local', testDir: './e2e/tests' },
    // Accounts, sharing and realtime against a local Supabase (yarn supabase start)
    { name: 'cloud', testDir: './e2e/cloud', timeout: 60000 },
  ],
};
