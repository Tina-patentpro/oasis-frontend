import { resolve } from 'node:path'

import { defineConfig, devices } from 'playwright/test'

const DEFAULT_E2E_PORT = 4173

function resolveE2ePort(rawPort: string | undefined): number {
  const normalizedPort = rawPort?.trim() ?? ''
  if (!normalizedPort) return DEFAULT_E2E_PORT
  if (!/^[1-9]\d{0,4}$/.test(normalizedPort)) {
    throw new Error('OASIS_E2E_PORT 必须是 1 到 65535 之间的整数')
  }

  const port = Number(normalizedPort)
  if (port > 65535) {
    throw new Error('OASIS_E2E_PORT 必须是 1 到 65535 之间的整数')
  }
  return port
}

const evidenceRoot = resolve(process.env.OASIS_E2E_OUTPUT_DIR ?? 'output/playwright')
const e2ePort = resolveE2ePort(process.env.OASIS_E2E_PORT)
const e2eOrigin = `http://127.0.0.1:${e2ePort}`

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: resolve(evidenceRoot, 'test-results'),
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  // Keep Vite cold compilation and browser startup deterministic across machines with different cores.
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { open: 'never', outputFolder: resolve(evidenceRoot, 'html-report') }],
    ['list'],
  ],
  use: {
    baseURL: e2eOrigin,
    trace: process.env.OASIS_E2E_FULL_EVIDENCE === '1' ? 'on' : 'retain-on-failure',
  },
  webServer: {
    command: `vite preview --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: e2eOrigin,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
