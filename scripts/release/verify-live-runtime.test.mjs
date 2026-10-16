import assert from 'node:assert/strict'
import test from 'node:test'

import { verifyLiveRuntime } from './verify-live-runtime.mjs'

function securityHeaders(phase, cacheControl, contentType = 'text/plain') {
  const cspHeader =
    phase === 'report-only'
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy'
  return {
    [cspHeader]:
      "default-src 'self'; form-action 'self'; frame-ancestors 'none'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    'Strict-Transport-Security':
      phase === 'report-only' ? 'max-age=300' : 'max-age=31536000',
    'Cache-Control': cacheControl,
    'Content-Type': contentType,
  }
}

function createFetch(phase, overrides = new Map()) {
  const html =
    '<link href="/assets/index-Ab12_cd3.css" rel="stylesheet"><script src="/assets/index-Ef45_gh6.js"></script>'
  const responses = new Map([
    ...['/', '/workspace', '/auth/login', '/user/profile-reward'].map((pathname) => [
      pathname,
      new Response(html, {
        status: 200,
        headers: securityHeaders(phase, 'no-cache', 'text/html; charset=utf-8'),
      }),
    ]),
    [
      '/assets/index-Ab12_cd3.css',
      new Response('src:url("./font-Ij78_kl9.woff2")', {
        status: 200,
        headers: securityHeaders(
          phase,
          'public, max-age=31536000, immutable',
          'text/css',
        ),
      }),
    ],
    [
      '/assets/index-Ef45_gh6.js',
      new Response('export {}', {
        status: 200,
        headers: securityHeaders(
          phase,
          'public, max-age=31536000, immutable',
          'text/javascript',
        ),
      }),
    ],
    [
      '/assets/font-Ij78_kl9.woff2',
      new Response('font', {
        status: 200,
        headers: securityHeaders(
          phase,
          'public, max-age=31536000, immutable',
          'font/woff2',
        ),
      }),
    ],
    ...[
      '/assets/oasis-runtime-verifier-missing.js',
      '/assets/oasis-runtime-verifier-missing.js.map',
      '/api',
      '/api/user/detail',
    ].map((pathname) => [
      pathname,
      new Response('not found', {
        status: 404,
        headers: securityHeaders(phase, 'no-store'),
      }),
    ]),
    ...overrides,
  ])

  return async (url) => {
    const pathname = new URL(url).pathname
    const response = responses.get(pathname)
    if (!response) throw new Error(`Unexpected test URL: ${url}`)
    return response.clone()
  }
}

for (const phase of ['report-only', 'enforced']) {
  test(`accepts the complete ${phase} header, cache and 404 contract`, async () => {
    const records = await verifyLiveRuntime({
      baseUrl: 'https://app.example.com',
      phase,
      fetchImpl: createFetch(phase),
    })

    assert.ok(records.some((record) => record.kind === 'font'))
    assert.equal(
      records.filter((record) => record.kind === 'expected-404').length,
      4,
    )
  })
}

test('rejects missing frame protection and soft 404 responses', async () => {
  const weakHeaders = securityHeaders('enforced', 'no-cache', 'text/html')
  weakHeaders['Content-Security-Policy'] = "default-src 'self'"

  await assert.rejects(
    () =>
      verifyLiveRuntime({
        baseUrl: 'https://app.example.com',
        phase: 'enforced',
        fetchImpl: createFetch(
          'enforced',
          new Map([
            [
              '/',
              new Response('<script src="/assets/index-Ef45_gh6.js"></script>', {
                status: 200,
                headers: weakHeaders,
              }),
            ],
          ]),
        ),
      }),
    /frame-ancestors/,
  )

  await assert.rejects(
    () =>
      verifyLiveRuntime({
        baseUrl: 'https://app.example.com',
        phase: 'enforced',
        fetchImpl: createFetch(
          'enforced',
          new Map([
            [
              '/api',
              new Response('<html>spa fallback</html>', {
                status: 200,
                headers: securityHeaders('enforced', 'no-cache', 'text/html'),
              }),
            ],
          ]),
        ),
      }),
    /returned 200; expected 404/,
  )
})
