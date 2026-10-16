import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_APP_URL = 'http://127.0.0.1:5173'
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_OUTPUT_DIR = 'output/browser-evidence/local-preview-smoke'
const TOKEN_STORAGE_KEY = 'auth_access_token_v1'
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 90
const EXTENSION_MESSAGE_CHANNEL_ERROR =
  'A listener indicated an asynchronous response by returning true'

function readFlagValue(args, index) {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${args[index]}`)
  }
  return value
}

function parseBooleanEnv(value) {
  return value === '1' || value === 'true' || value === 'yes'
}

function parsePositiveInteger(value, optionName) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive integer, received: ${value}`)
  }
  return parsed
}

function normalizeAppUrl(value) {
  const url = new URL(value)
  url.hash = ''
  return url.toString().replace(/\/+$/, '')
}

export function parseCliArgs(args, env = process.env, cwd = process.cwd()) {
  const options = {
    appUrl: env.OASIS_E2E_APP_URL || DEFAULT_APP_URL,
    outputDir: resolve(cwd, env.OASIS_E2E_OUTPUT_DIR || DEFAULT_OUTPUT_DIR),
    storageState: env.OASIS_E2E_STORAGE_STATE
      ? resolve(cwd, env.OASIS_E2E_STORAGE_STATE)
      : '',
    accessToken: env.OASIS_E2E_ACCESS_TOKEN || '',
    timeoutMs: env.OASIS_E2E_TIMEOUT_MS
      ? parsePositiveInteger(env.OASIS_E2E_TIMEOUT_MS, 'OASIS_E2E_TIMEOUT_MS')
      : DEFAULT_TIMEOUT_MS,
    headed: parseBooleanEnv(env.OASIS_E2E_HEADED),
    help: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }
    if (arg === '--headed') {
      options.headed = true
      continue
    }

    const value = readFlagValue(args, index)
    index += 1

    if (arg === '--app-url') {
      options.appUrl = value
    } else if (arg === '--output-dir') {
      options.outputDir = resolve(cwd, value)
    } else if (arg === '--storage-state') {
      options.storageState = resolve(cwd, value)
    } else if (arg === '--token') {
      options.accessToken = value
    } else if (arg === '--timeout-ms') {
      options.timeoutMs = parsePositiveInteger(value, arg)
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }

  return options
}

function printHelp() {
  console.log(`Usage: node scripts/e2e/local-preview-smoke.mjs [options]

Read-only smoke test for local preview:
  open local app -> check /api uses local origin -> capture console/network summary

Options:
  --app-url <url>          Frontend URL. Default: ${DEFAULT_APP_URL}
  --output-dir <path>      Evidence output directory. Default: ${DEFAULT_OUTPUT_DIR}
  --storage-state <path>   Optional Playwright storage state for logged-in checks
  --token <token>          Optional access token. Prefer env/storage-state to avoid shell history leaks
  --timeout-ms <ms>        Timeout. Default: ${DEFAULT_TIMEOUT_MS}
  --headed                 Show browser window

Environment alternatives:
  OASIS_E2E_APP_URL
  OASIS_E2E_OUTPUT_DIR
  OASIS_E2E_STORAGE_STATE
  OASIS_E2E_ACCESS_TOKEN
  OASIS_E2E_TIMEOUT_MS
  OASIS_E2E_HEADED
`)
}

async function seedAccessToken(page, appUrl, token) {
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ({ storageKey, accessToken, ttlMs }) => {
      const now = Date.now()
      const binding = `${navigator.language || ''}|${navigator.userAgent || ''}`
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          token: accessToken,
          issuedAt: now,
          expiresAt: now + ttlMs,
          binding,
        }),
      )
    },
    { storageKey: TOKEN_STORAGE_KEY, accessToken: token, ttlMs: TOKEN_TTL_MS },
  )
}

function isExtensionMessageChannelError(message) {
  return String(message || '').includes(EXTENSION_MESSAGE_CHANNEL_ERROR)
}

function isExpectedUnauthenticatedProbeError(entry, probe) {
  return (
    !probe.hasAuthToken &&
    probe.status === 401 &&
    String(entry.location?.url || '').endsWith('/api/user/detail') &&
    String(entry.text || '').includes('401')
  )
}

function isBusinessConsoleError(entry, probe) {
  return (
    entry.type === 'error' &&
    !isExtensionMessageChannelError(entry.text) &&
    !isExpectedUnauthenticatedProbeError(entry, probe)
  )
}

function isApiUrl(url) {
  return String(url || '').includes('/api/')
}

function isLocalApiUrl(url, appUrl) {
  const base = new URL(appUrl)
  const parsed = new URL(url)
  return parsed.origin === base.origin && parsed.pathname.startsWith('/api/')
}

export async function runLocalPreviewSmoke(options) {
  const appUrl = normalizeAppUrl(options.appUrl)
  const workspaceUrl = `${appUrl}/workspace`
  mkdirSync(options.outputDir, { recursive: true })

  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: !options.headed })
  const context = await browser.newContext(
    options.storageState ? { storageState: options.storageState } : {},
  )
  const page = await context.newPage()
  page.setDefaultTimeout(options.timeoutMs)

  const consoleEntries = []
  const pageErrors = []
  const requestFailures = []
  const apiResponses = []

  page.on('console', (message) => {
    consoleEntries.push({
      type: message.type(),
      text: message.text(),
      location: message.location(),
    })
  })
  page.on('pageerror', (error) => {
    pageErrors.push({ name: error.name, message: error.message })
  })
  page.on('requestfailed', (request) => {
    requestFailures.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText || '',
    })
  })
  page.on('response', (response) => {
    const url = response.url()
    if (isApiUrl(url)) {
      apiResponses.push({
        method: response.request().method(),
        url,
        status: response.status(),
        ok: response.ok(),
      })
    }
  })

  try {
    if (options.accessToken) {
      await seedAccessToken(page, appUrl, options.accessToken)
    }

    await page.goto(workspaceUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: options.timeoutMs }).catch(() => null)

    const probe = await page.evaluate(async ({ storageKey }) => {
      let token = ''
      try {
        const raw = localStorage.getItem(storageKey)
        const parsed = raw ? JSON.parse(raw) : null
        token = typeof parsed?.token === 'string' ? parsed.token : ''
      } catch {
        token = ''
      }

      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const startedAt = Date.now()
      try {
        const response = await fetch('/api/user/detail', { headers })
        const text = await response.text()
        return {
          requestedUrl: '/api/user/detail',
          resolvedUrl: new URL('/api/user/detail', location.href).href,
          status: response.status,
          ok: response.ok,
          elapsedMs: Date.now() - startedAt,
          hasAuthToken: Boolean(token),
          authHeaderSent: Boolean(headers.Authorization),
          requestHeaders: headers.Authorization ? { Authorization: '<redacted>' } : {},
          bodySample: text.slice(0, 300),
        }
      } catch (error) {
        return {
          requestedUrl: '/api/user/detail',
          resolvedUrl: new URL('/api/user/detail', location.href).href,
          errorName: error.name,
          errorMessage: error.message,
          elapsedMs: Date.now() - startedAt,
          hasAuthToken: Boolean(token),
          authHeaderSent: Boolean(headers.Authorization),
          requestHeaders: headers.Authorization ? { Authorization: '<redacted>' } : {},
        }
      }
    }, { storageKey: TOKEN_STORAGE_KEY })

    await page.screenshot({
      path: resolve(options.outputDir, 'local-preview-smoke.png'),
      fullPage: true,
    })

    const bodyText = await page.locator('body').innerText({ timeout: options.timeoutMs })
    const localApiResponses = apiResponses.filter((entry) => isLocalApiUrl(entry.url, appUrl))
    const remoteApiResponses = apiResponses.filter((entry) => !isLocalApiUrl(entry.url, appUrl))
    const businessConsoleErrors = consoleEntries.filter((entry) =>
      isBusinessConsoleError(entry, probe),
    )
    const failedFetchMessages = [
      ...consoleEntries.map((entry) => entry.text),
      ...pageErrors.map((entry) => entry.message),
      ...requestFailures.map((entry) => entry.failure),
      probe.errorMessage || '',
    ].filter((message) => String(message).includes('Failed to fetch'))

    const summary = {
      ok: true,
      checkedAt: new Date().toISOString(),
      appUrl,
      workspaceUrl,
      finalUrl: page.url(),
      title: await page.title(),
      browser: 'Playwright Chromium',
      environment: 'local preview',
      screenshotPath: resolve(options.outputDir, 'local-preview-smoke.png'),
      summaryPath: resolve(options.outputDir, 'local-preview-smoke-summary.json'),
      pageTextSample: bodyText.slice(0, 1200),
      apiProbe: probe,
      apiResponses,
      localApiCount: localApiResponses.length,
      remoteApiCount: remoteApiResponses.length,
      requestFailures,
      consoleEntries,
      businessConsoleErrors,
      pageErrors,
      failedFetchMessages,
    }

    const assertions = [
      {
        name: 'app origin is local preview',
        pass: new URL(summary.finalUrl).origin === new URL(appUrl).origin,
      },
      {
        name: 'api probe resolves to local /api',
        pass: isLocalApiUrl(probe.resolvedUrl, appUrl),
      },
      {
        name: 'api probe did not throw Failed to fetch',
        pass: !probe.errorMessage,
      },
      {
        name: 'no remote api response observed',
        pass: remoteApiResponses.length === 0,
      },
      {
        name: 'no browser request failure observed',
        pass: requestFailures.length === 0,
      },
      {
        name: 'no Failed to fetch message observed',
        pass: failedFetchMessages.length === 0,
      },
      {
        name: 'no business console error observed',
        pass: businessConsoleErrors.length === 0,
      },
    ]

    summary.assertions = assertions
    summary.ok = assertions.every((item) => item.pass)

    writeFileSync(summary.summaryPath, JSON.stringify(summary, null, 2), 'utf8')

    if (!summary.ok) {
      const failed = assertions.filter((item) => !item.pass).map((item) => item.name).join(', ')
      throw new Error(`Local preview smoke failed: ${failed}`)
    }

    return summary
  } finally {
    await context.close()
    await browser.close()
  }
}

export function printResult(result, output = console) {
  output.log('Local preview smoke passed.')
  output.log(`- URL: ${result.finalUrl}`)
  output.log(`- Local API responses: ${result.localApiCount}`)
  output.log(`- Remote API responses: ${result.remoteApiCount}`)
  output.log(`- Request failures: ${result.requestFailures.length}`)
  output.log(`- Business console errors: ${result.businessConsoleErrors.length}`)
  output.log(`- Screenshot: ${result.screenshotPath}`)
  output.log(`- Summary: ${result.summaryPath}`)
}

async function runCli() {
  const options = parseCliArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const result = await runLocalPreviewSmoke(options)
  printResult(result)
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
