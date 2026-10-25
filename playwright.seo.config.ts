import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests', testMatch: '*.seo.ts', workers: 1, timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:8790', locale: 'en-US',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined) },
  },
  webServer: {
    command: 'npx wrangler dev --ip 127.0.0.1 --port 8790',
    url: 'http://127.0.0.1:8790', timeout: 60000,
    env: { WRANGLER_SEND_METRICS: 'false' },
  },
})
