import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', testMatch: '*.spec.ts', workers: 1, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:8788', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined) } },
  webServer: { command: 'npm run cms:build && npx wrangler d1 migrations apply super0to1-cms --config cms/wrangler.dev.jsonc --local && npm run cms:api', url: 'http://127.0.0.1:8788', reuseExistingServer: !process.env.CI, timeout: 120000 },
})
