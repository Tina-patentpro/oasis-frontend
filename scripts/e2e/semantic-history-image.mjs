import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_APP_URL = 'http://127.0.0.1:5173'
const DEFAULT_TIMEOUT_MS = 45_000
const DEFAULT_SESSION_KEYWORD = '语义生图'
const DEFAULT_SCREENSHOT_PATH = 'output/playwright/semantic-history-image.png'
const TOKEN_STORAGE_KEY = 'auth_access_token_v1'
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 90
const IMAGE_URL_PATTERN = /\.(?:png|jpe?g|gif|webp|bmp|svg)(?:[?#]|$)/i
const FILE_URL_SPLITTER = /,(?=\s*(?:https?:\/\/|\/|files\/))/i

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

export function parseCliArgs(args, env = process.env, cwd = process.cwd()) {
  const options = {
    appUrl: env.OASIS_E2E_APP_URL || DEFAULT_APP_URL,
    accessToken: env.OASIS_E2E_ACCESS_TOKEN || '',
    storageState: env.OASIS_E2E_STORAGE_STATE
      ? resolve(cwd, env.OASIS_E2E_STORAGE_STATE)
      : '',
    sessionId: env.OASIS_E2E_SESSION_ID || '',
    sessionTitle: env.OASIS_E2E_SESSION_TITLE || '',
    sessionKeyword: env.OASIS_E2E_SESSION_KEYWORD || DEFAULT_SESSION_KEYWORD,
    projectId: env.OASIS_E2E_PROJECT_ID || '',
    projectTitle: env.OASIS_E2E_PROJECT_TITLE || '',
    timeoutMs: env.OASIS_E2E_TIMEOUT_MS
      ? parsePositiveInteger(env.OASIS_E2E_TIMEOUT_MS, 'OASIS_E2E_TIMEOUT_MS')
      : DEFAULT_TIMEOUT_MS,
    headed: parseBooleanEnv(env.OASIS_E2E_HEADED),
    allowUnauthenticated: parseBooleanEnv(env.OASIS_E2E_ALLOW_UNAUTHENTICATED),
    screenshotPath: resolve(cwd, env.OASIS_E2E_SCREENSHOT || DEFAULT_SCREENSHOT_PATH),
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
    if (arg === '--allow-unauthenticated') {
      options.allowUnauthenticated = true
      continue
    }

    const value = readFlagValue(args, index)
    index += 1

    if (arg === '--app-url') {
      options.appUrl = value
    } else if (arg === '--token') {
      options.accessToken = value
    } else if (arg === '--storage-state') {
      options.storageState = resolve(cwd, value)
    } else if (arg === '--session-id') {
      options.sessionId = value
    } else if (arg === '--session-title') {
      options.sessionTitle = value
    } else if (arg === '--session-keyword') {
      options.sessionKeyword = value
    } else if (arg === '--project-id') {
      options.projectId = value
    } else if (arg === '--project-title') {
      options.projectTitle = value
    } else if (arg === '--timeout-ms') {
      options.timeoutMs = parsePositiveInteger(value, arg)
    } else if (arg === '--screenshot') {
      options.screenshotPath = resolve(cwd, value)
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }

  return options
}

export function validateRuntimeOptions(options) {
  try {
    new URL(options.appUrl)
  } catch {
    throw new Error(`Invalid --app-url: ${options.appUrl}`)
  }

  if (!options.accessToken && !options.storageState && !options.allowUnauthenticated) {
    throw new Error(
      'Missing login state. Set OASIS_E2E_ACCESS_TOKEN or OASIS_E2E_STORAGE_STATE, ' +
        'or pass --allow-unauthenticated only when the target app is already publicly accessible.',
    )
  }

  if (options.storageState && !existsSync(options.storageState)) {
    throw new Error(`Storage state file not found: ${options.storageState}`)
  }

  return options
}

function safeUrl(rawUrl) {
  try {
    return new URL(rawUrl)
  } catch {
    return null
  }
}

export function isProjectListUrl(rawUrl, expectedFolderId = '') {
  const url = safeUrl(rawUrl)
  if (!url) return false
  if (!url.pathname.replace(/\/+$/, '').endsWith('/user/user/projectlist')) {
    return false
  }
  return !expectedFolderId || url.searchParams.get('folder_id') === String(expectedFolderId)
}

export function isProjectDetailUrl(rawUrl, expectedSessionId = '') {
  const url = safeUrl(rawUrl)
  if (!url) return false
  const match = url.pathname.replace(/\/+$/, '').match(/\/user\/user\/projectdetail\/([^/]+)$/)
  if (!match) return false
  return !expectedSessionId || decodeURIComponent(match[1]) === String(expectedSessionId)
}

function unwrapBackendRecord(payload) {
  if (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object') {
    return payload.data
  }
  return payload
}

function normalizeListItems(payload) {
  const record = unwrapBackendRecord(payload)
  if (!record || typeof record !== 'object') {
    return []
  }
  if (Array.isArray(record.items)) return record.items
  if (Array.isArray(record.item)) return record.item
  return []
}

function parseInputs(rawInputs) {
  if (!rawInputs) return {}
  if (typeof rawInputs === 'object' && !Array.isArray(rawInputs)) return rawInputs
  if (typeof rawInputs !== 'string') return {}
  try {
    const parsed = JSON.parse(rawInputs)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeInputType(value) {
  if (value === 2 || value === '2') return 2
  if (value === 1 || value === '1') return 1
  if (value === 3 || value === '3') return 3
  return undefined
}

function getSessionTitle(record) {
  return String(record?.name || record?.title || record?.api_name || '')
}

function formatHistoryDate(value) {
  const match = String(value || '').match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/,
  )
  if (!match) return ''
  const [, year, month, day, hour, minute, second] = match
  return `${year}/${Number(month)}/${Number(day)} ${hour}:${minute}:${second}`
}

export function getTitleOccurrenceIndexById(items) {
  const titleCounts = new Map()
  const indexById = new Map()

  if (!Array.isArray(items)) {
    return indexById
  }

  items.forEach((item) => {
    const title = getSessionTitle(item)
    if (!title) {
      return
    }
    const index = titleCounts.get(title) || 0
    titleCounts.set(title, index + 1)
    if (item?.id !== undefined && item?.id !== null) {
      indexById.set(item.id, index)
    }
  })

  return indexById
}

function sameText(left, right) {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function isImageLikeUrl(value) {
  return typeof value === 'string' && IMAGE_URL_PATTERN.test(value.trim())
}

function extractMarkdownImageUrls(value) {
  if (typeof value !== 'string' || !value.includes('![')) {
    return []
  }
  const urls = []
  const pattern = /!\[[^\]]*]\((?:<([^>]+)>|([^)]+))\)/g
  let match
  while ((match = pattern.exec(value)) !== null) {
    const url = (match[1] || match[2] || '').trim()
    if (isImageLikeUrl(url)) {
      urls.push(url)
    }
  }
  return urls
}

function parseResponsePayload(value) {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function splitFileUrls(value) {
  if (Array.isArray(value)) {
    return value.flatMap(splitFileUrls)
  }
  if (typeof value !== 'string') {
    return []
  }
  return value
    .split(FILE_URL_SPLITTER)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getOutputUrl(output) {
  if (!output || typeof output !== 'object') return ''
  return String(
    output.url ||
      output.file_url ||
      output.fileUrl ||
      output.remote_url ||
      output.remoteUrl ||
      output.preview_url ||
      output.previewUrl ||
      output.download_url ||
      output.downloadUrl ||
      '',
  )
}

function isImageOutput(output) {
  if (!output || typeof output !== 'object') return false
  const type = String(
    output.type || output.file_type || output.fileType || output.extension || '',
  ).toLowerCase()
  const mime = String(output.mime_type || output.mimeType || output.mime || '').toLowerCase()
  const url = getOutputUrl(output)
  return (
    type.includes('image') ||
    mime.startsWith('image/') ||
    IMAGE_URL_PATTERN.test(url) ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(type)
  )
}

function collectImageSourcesFromUnknownValue(value, add) {
  if (!value) return
  if (typeof value === 'string') {
    splitFileUrls(value).filter(isImageLikeUrl).forEach(add)
    extractMarkdownImageUrls(value).forEach(add)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectImageSourcesFromUnknownValue(item, add))
    return
  }
  if (typeof value === 'object') {
    if (isImageOutput(value)) {
      add(getOutputUrl(value).trim())
    }
    Object.values(value).forEach((item) => collectImageSourcesFromUnknownValue(item, add))
  }
}

export function collectImageSourcesFromRecord(record) {
  const data = unwrapBackendRecord(record)
  const sources = []
  const seen = new Set()
  const add = (source) => {
    if (!source || seen.has(source)) return
    seen.add(source)
    sources.push(source)
  }

  splitFileUrls(data?.file_url).filter(isImageLikeUrl).forEach(add)
  splitFileUrls(data?.fileUrl).filter(isImageLikeUrl).forEach(add)
  extractMarkdownImageUrls(data?.answer_text).forEach(add)
  extractMarkdownImageUrls(data?.answer).forEach(add)
  extractMarkdownImageUrls(data?.generatedContent).forEach(add)
  const responsePayload = parseResponsePayload(data?.response)
  extractMarkdownImageUrls(responsePayload.answer).forEach(add)

  if (Array.isArray(data?.file_output)) {
    data.file_output.forEach((output) => {
      if (isImageOutput(output)) {
        add(getOutputUrl(output).trim())
      }
    })
  }
  collectImageSourcesFromUnknownValue(data?.fileOutput, add)
  collectImageSourcesFromUnknownValue(data?.outputs, add)
  collectImageSourcesFromUnknownValue(data?.result, add)

  return sources
}

export function isSemanticImageSession(record, options = {}) {
  if (!record || typeof record !== 'object') {
    return false
  }
  const isChatflow = Number(record.type) === 2 || String(record.toolType || '').startsWith('chat.')
  if (!isChatflow) {
    return false
  }

  const inputs = parseInputs(record.inputs)
  const inputType = normalizeInputType(inputs.type)
  const title = getSessionTitle(record)
  const keyword = options.sessionKeyword || DEFAULT_SESSION_KEYWORD

  return inputType === 2 || String(record.toolType) === 'chat.image' || title.includes(keyword)
}

export function findTargetSessions(items, options = {}) {
  if (!Array.isArray(items)) {
    return []
  }

  if (options.sessionId) {
    const byId = items.find((item) => String(item?.id) === String(options.sessionId))
    if (byId) return [byId]
  }

  if (options.sessionTitle) {
    const byExactTitle = items.find((item) => sameText(getSessionTitle(item), options.sessionTitle))
    if (byExactTitle) return [byExactTitle]
    const byPartialTitle = items.find((item) => getSessionTitle(item).includes(options.sessionTitle))
    if (byPartialTitle) return [byPartialTitle]
  }

  const semanticSessions = items.filter((item) => isSemanticImageSession(item, options))
  return semanticSessions.sort((left, right) => {
    const leftHasListImage = collectImageSourcesFromRecord(left).length > 0
    const rightHasListImage = collectImageSourcesFromRecord(right).length > 0
    if (leftHasListImage === rightHasListImage) return 0
    return leftHasListImage ? -1 : 1
  })
}

export function findTargetSession(items, options = {}) {
  return findTargetSessions(items, options)[0] || null
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
      localStorage.removeItem('access_token')
      localStorage.removeItem('accessToken')
    },
    { storageKey: TOKEN_STORAGE_KEY, accessToken: token, ttlMs: TOKEN_TTL_MS },
  )
}

async function readJsonResponse(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function clickHistorySession(page, targetSession, options) {
  const title = getSessionTitle(targetSession) || options.sessionTitle || options.sessionKeyword
  const dateLabel = formatHistoryDate(
    targetSession.created_at || targetSession.create_time || targetSession.updated_at,
  )
  if (dateLabel) {
    const dateCandidates = page.locator('[role="button"]').filter({ hasText: dateLabel })
    const dateCandidateCount = await dateCandidates.count()
    if (dateCandidateCount > 0) {
      await dateCandidates.nth(dateCandidateCount - 1).click({
        timeout: Math.min(options.timeoutMs, 10_000),
      })
      return title
    }
  }

  const titlePattern = new RegExp(escapeRegExp(title))
  const occurrenceIndex =
    typeof targetSession.__e2eTitleOccurrenceIndex === 'number'
      ? targetSession.__e2eTitleOccurrenceIndex
      : 0
  const candidates = [
    page.getByRole('button', { name: titlePattern }).nth(occurrenceIndex),
    page.getByText(title, { exact: false }).nth(occurrenceIndex),
  ]

  for (const candidate of candidates) {
    try {
      await candidate.click({ timeout: Math.min(options.timeoutMs, 10_000) })
      return title
    } catch {
      // Try the next locator.
    }
  }

  throw new Error(
    `Could not click history session "${title}". ` +
      'If the title is duplicated or hidden, rerun with --session-title for a visible unique title.',
  )
}


async function fetchProjectTitle(page, projectId) {
  if (!projectId) return ''
  return page.evaluate(
    async ({ tokenStorageKey, folderId }) => {
      let token = ''
      try {
        const raw = localStorage.getItem(tokenStorageKey)
        const parsed = raw ? JSON.parse(raw) : null
        token = typeof parsed?.token === 'string' ? parsed.token : ''
      } catch {
        token = ''
      }
      const response = await fetch(`/api/user/user/folderdetail/${encodeURIComponent(folderId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await response.json().catch(() => null)
      return String(payload?.data?.name || '')
    },
    { tokenStorageKey: TOKEN_STORAGE_KEY, folderId: projectId },
  )
}

async function openProjectHistoryScope(page, options) {
  const projectTitle = options.projectTitle || (await fetchProjectTitle(page, options.projectId))
  if (!projectTitle) {
    throw new Error(
      'Project history mode requires --project-title or a resolvable --project-id folder detail.',
    )
  }

  await page.getByText('项目管理', { exact: true }).click({
    timeout: Math.min(options.timeoutMs, 10_000),
  })

  const listResponsePromise = page.waitForResponse(
    (response) => isProjectListUrl(response.url(), options.projectId),
    { timeout: options.timeoutMs },
  )
  const projectCards = page.locator('[role="button"]').filter({ hasText: projectTitle })
  const projectCardCount = await projectCards.count()
  if (projectCardCount === 0) {
    throw new Error(`Could not find project card "${projectTitle}" in project management.`)
  }
  await projectCards.nth(0).click({ timeout: Math.min(options.timeoutMs, 10_000) })
  return listResponsePromise
}

function getComparableImageNeedles(sources) {
  return sources
    .map((source) => {
      const trimmed = source.trim()
      if (!trimmed) return ''
      const url = safeUrl(trimmed)
      return url ? `${url.pathname}${url.search}` : trimmed.replace(/^https?:\/\/[^/]+/i, '')
    })
    .filter(Boolean)
}

async function waitForRenderedImage(page, imageSources, timeoutMs) {
  const needles = getComparableImageNeedles(imageSources)
  if (needles.length === 0) {
    throw new Error('The selected history detail did not include an image file_url or file_output.')
  }

  await page.waitForFunction(
    (expectedNeedles) => {
      const images = Array.from(document.images)
      return images.some((image) => {
        const src = image.currentSrc || image.src || image.getAttribute('src') || ''
        return (
          expectedNeedles.some((needle) => src.includes(needle)) &&
          image.complete &&
          image.naturalWidth > 0 &&
          image.naturalHeight > 0
        )
      })
    },
    needles,
    { timeout: timeoutMs },
  )
}

export async function runSemanticHistoryImageE2E(options) {
  validateRuntimeOptions(options)
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: !options.headed })
  const context = await browser.newContext(
    options.storageState ? { storageState: options.storageState } : {},
  )
  const page = await context.newPage()
  page.setDefaultTimeout(options.timeoutMs)

  try {
    if (options.accessToken) {
      await seedAccessToken(page, options.appUrl, options.accessToken)
    }

    const initialListResponsePromise = page
      .waitForResponse((response) => isProjectListUrl(response.url()), {
        timeout: options.timeoutMs,
      })
      .catch(() => null)

    await page.goto(options.appUrl, { waitUntil: 'networkidle' })

    const listResponse =
      options.projectId || options.projectTitle
        ? await openProjectHistoryScope(page, options)
        : await initialListResponsePromise
    const listPayload = listResponse ? await readJsonResponse(listResponse) : null
    const listItems = normalizeListItems(listPayload)
    const titleOccurrenceIndexById = getTitleOccurrenceIndexById(listItems)
    const targetSessions = findTargetSessions(listItems, options).map((session) => ({
      ...session,
      __e2eTitleOccurrenceIndex: titleOccurrenceIndexById.get(session.id) || 0,
    }))

    if (targetSessions.length === 0) {
      throw new Error(
        'Could not find a semantic image history session from /user/user/projectlist. ' +
          'Set OASIS_E2E_SESSION_ID, OASIS_E2E_SESSION_TITLE, or OASIS_E2E_SESSION_KEYWORD.',
      )
    }

    const sessionsWithoutImages = []
    let lastClickError = null

    for (const targetSession of targetSessions) {
      const expectedSessionId = options.sessionId || targetSession.id || ''
      let clickedTitle = ''
      let detailResponse = null
      try {
        ;[detailResponse, clickedTitle] = await Promise.all([
          page.waitForResponse((response) => isProjectDetailUrl(response.url(), expectedSessionId), {
            timeout: options.timeoutMs,
          }),
          clickHistorySession(page, targetSession, options),
        ])
      } catch (error) {
        lastClickError = error
        continue
      }

      const detailPayload = await readJsonResponse(detailResponse)
      const imageSources = collectImageSourcesFromRecord(detailPayload)
      if (imageSources.length === 0) {
        sessionsWithoutImages.push(clickedTitle)
        continue
      }

      await waitForRenderedImage(page, imageSources, options.timeoutMs)

      if (options.screenshotPath) {
        mkdirSync(dirname(options.screenshotPath), { recursive: true })
        await page.screenshot({ path: options.screenshotPath, fullPage: true })
      }

      return {
        ok: true,
        title: clickedTitle,
        sessionId: expectedSessionId || targetSession.id,
        detailUrl: detailResponse.url(),
        imageSources,
        screenshotPath: options.screenshotPath,
      }
    }

    if (lastClickError && sessionsWithoutImages.length === 0) {
      throw lastClickError
    }
    throw new Error(
      'No semantic image history session with image file_url or file_output was found. ' +
        `Checked ${targetSessions.length} candidate(s)` +
        (sessionsWithoutImages.length > 0
          ? `; sessions without images: ${sessionsWithoutImages.join(', ')}.`
          : '.'),
    )
  } finally {
    await context.close()
    await browser.close()
  }
}

function printHelp() {
  console.log(`Usage: node scripts/e2e/semantic-history-image.mjs [options]

Checks the real backend history flow:
  open app -> read /user/user/projectlist -> click semantic image history
  -> wait for /user/user/projectdetail/{id} -> verify rendered image loaded

Required login state:
  OASIS_E2E_ACCESS_TOKEN=<token>
  or OASIS_E2E_STORAGE_STATE=<path-to-playwright-storage-state.json>
  or --allow-unauthenticated when the target app is public or already accessible

Options:
  --app-url <url>              Frontend URL. Default: ${DEFAULT_APP_URL}
  --token <token>              Access token. Prefer env/storage-state to avoid shell history leaks
  --storage-state <path>       Playwright storage state file
  --session-id <id>            Prefer a specific backend history id
  --session-title <title>      Prefer a visible unique history title
  --session-keyword <keyword>  Semantic image title keyword. Default: ${DEFAULT_SESSION_KEYWORD}
  --project-id <id>            Check histories inside a specific project/folder id
  --project-title <title>      Visible project title used when opening project history
  --allow-unauthenticated      Skip login-state validation for public test targets
  --timeout-ms <ms>            Timeout. Default: ${DEFAULT_TIMEOUT_MS}
  --headed                     Show browser window
  --screenshot <path>          Screenshot output. Default: ${DEFAULT_SCREENSHOT_PATH}
`)
}

export function maskImageSource(source) {
  const url = safeUrl(source)
  if (!url || !url.search) {
    return source
  }
  return `${url.origin}${url.pathname}?…${url.hash}`
}

export function printResult(result, output = console) {
  output.log('Semantic image history E2E passed.')
  output.log(`- Session: ${result.title} (${result.sessionId || 'unknown id'})`)
  output.log(`- Detail API: ${result.detailUrl}`)
  output.log(`- Image sources: ${result.imageSources.map(maskImageSource).join(', ')}`)
  output.log(`- Screenshot: ${result.screenshotPath}`)
}

async function runCli() {
  const options = parseCliArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const result = await runSemanticHistoryImageE2E(options)
  printResult(result)
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
