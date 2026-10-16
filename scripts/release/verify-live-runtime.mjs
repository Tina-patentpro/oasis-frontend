#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const HTML_PATHS = ['/', '/workspace', '/auth/login', '/user/profile-reward']
const REQUIRED_HEADERS = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
}

function requireHeader(response, name, expectedValue) {
  const value = response.headers.get(name)
  if (!value) {
    throw new Error(`${name} is missing from ${response.url || 'response'}.`)
  }
  if (expectedValue && value.toLowerCase() !== expectedValue.toLowerCase()) {
    throw new Error(`${name} has an unexpected value: ${value}`)
  }
  return value
}

function verifySecurityHeaders(response, phase) {
  for (const [name, value] of Object.entries(REQUIRED_HEADERS)) {
    requireHeader(response, name, value)
  }
  requireHeader(response, 'permissions-policy')

  const cspHeader =
    phase === 'report-only'
      ? 'content-security-policy-report-only'
      : 'content-security-policy'
  const csp = requireHeader(response, cspHeader)
  if (!csp.includes("frame-ancestors 'none'")) {
    throw new Error(`${cspHeader} is missing frame-ancestors 'none'.`)
  }
  if (/localhost|127\.0\.0\.1/.test(csp)) {
    throw new Error(`${cspHeader} contains a local development origin.`)
  }

  const hsts = requireHeader(response, 'strict-transport-security')
  const maxAge = Number.parseInt(hsts.match(/max-age=(\d+)/i)?.[1] ?? '', 10)
  const requiredMaxAge = phase === 'report-only' ? 300 : 31_536_000
  if (!Number.isFinite(maxAge) || maxAge < requiredMaxAge) {
    throw new Error(
      `strict-transport-security max-age ${maxAge || 0} is below ${requiredMaxAge}.`,
    )
  }
}

function extractHtmlAssets(html) {
  return Array.from(
    html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+\.(?:js|css))"/g),
    (match) => match[1],
  )
}

function extractCssFonts(css, cssUrl) {
  const fonts = []
  for (const match of css.matchAll(/url\((?:"|')?([^"')]+\.woff2)(?:"|')?\)/g)) {
    fonts.push(new URL(match[1], cssUrl).href)
  }
  return fonts
}

function verifyCacheControl(response, expectedTokens) {
  const cacheControl = requireHeader(response, 'cache-control').toLowerCase()
  for (const token of expectedTokens) {
    if (!cacheControl.includes(token)) {
      throw new Error(`cache-control is missing ${token}: ${cacheControl}`)
    }
  }
}

async function fetchChecked(fetchImpl, url, expectedStatus) {
  const response = await fetchImpl(url, {
    method: 'GET',
    redirect: 'manual',
    headers: { 'User-Agent': 'oasis-read-only-live-verifier/1' },
  })
  if (response.status !== expectedStatus) {
    throw new Error(`${url} returned ${response.status}; expected ${expectedStatus}.`)
  }
  return response
}

export async function verifyLiveRuntime({
  baseUrl,
  phase,
  fetchImpl = fetch,
}) {
  if (phase !== 'report-only' && phase !== 'enforced') {
    throw new Error(`Unsupported verification phase: ${phase}`)
  }
  const origin = new URL(baseUrl)
  if (origin.protocol !== 'https:') {
    throw new Error('Live verification requires an HTTPS base URL.')
  }

  const records = []
  let rootHtml = ''
  for (const pathname of HTML_PATHS) {
    const url = new URL(pathname, origin).href
    const response = await fetchChecked(fetchImpl, url, 200)
    verifySecurityHeaders(response, phase)
    verifyCacheControl(response, ['no-cache'])
    const contentType = requireHeader(response, 'content-type')
    if (!contentType.toLowerCase().includes('text/html')) {
      throw new Error(`${pathname} did not return HTML: ${contentType}`)
    }
    const body = await response.text()
    if (pathname === '/') rootHtml = body
    records.push({ pathname, status: response.status, kind: 'html' })
  }

  const assetUrls = new Set(
    extractHtmlAssets(rootHtml).map((asset) => new URL(asset, origin).href),
  )
  if (assetUrls.size === 0) {
    throw new Error('No production JS/CSS assets were discovered from the root HTML.')
  }

  const fontUrls = new Set()
  for (const assetUrl of assetUrls) {
    const response = await fetchChecked(fetchImpl, assetUrl, 200)
    verifySecurityHeaders(response, phase)
    verifyCacheControl(response, ['public', 'max-age=31536000', 'immutable'])
    if (assetUrl.endsWith('.css')) {
      const css = await response.text()
      for (const fontUrl of extractCssFonts(css, assetUrl)) fontUrls.add(fontUrl)
    }
    records.push({
      pathname: new URL(assetUrl).pathname,
      status: response.status,
      kind: 'asset',
    })
  }

  for (const fontUrl of fontUrls) {
    const response = await fetchChecked(fetchImpl, fontUrl, 200)
    verifySecurityHeaders(response, phase)
    verifyCacheControl(response, ['public', 'max-age=31536000', 'immutable'])
    records.push({
      pathname: new URL(fontUrl).pathname,
      status: response.status,
      kind: 'font',
    })
  }

  for (const pathname of [
    '/assets/oasis-runtime-verifier-missing.js',
    '/assets/oasis-runtime-verifier-missing.js.map',
    '/api',
    '/api/user/detail',
  ]) {
    const response = await fetchChecked(fetchImpl, new URL(pathname, origin).href, 404)
    verifySecurityHeaders(response, phase)
    records.push({ pathname, status: response.status, kind: 'expected-404' })
  }

  return records
}

function parseArguments(argv) {
  let baseUrl = ''
  let phase = ''
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]
    if (argument === '--base-url' && value) {
      baseUrl = value
      index += 1
    } else if (argument === '--phase' && value) {
      phase = value
      index += 1
    } else {
      throw new Error(`Unsupported live verifier argument: ${argument}`)
    }
  }
  if (!baseUrl || !phase) {
    throw new Error('Usage: verify-live-runtime --base-url https://host --phase report-only|enforced')
  }
  return { baseUrl, phase }
}

async function main() {
  const records = await verifyLiveRuntime(parseArguments(process.argv.slice(2)))
  console.log(JSON.stringify({ result: 'PASS', records }, null, 2))
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
