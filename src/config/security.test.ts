import { describe, expect, test } from '@jest/globals'

import {
  createSecurityCsp,
  SECURITY_DEV_CSP,
  SECURITY_HEADERS,
  SECURITY_META_CSP,
} from './security'

const getDirective = (csp: string, name: string): string =>
  csp.split('; ').find((directive) => directive.startsWith(name)) ?? ''

const hasBareHttpsSource = (directive: string): boolean =>
  directive.split(/\s+/).some((source) => source === 'https:')

describe('security headers', () => {
  test('contains csp without unsafe-inline script', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy']
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'")
  })

  test('does not allow bare https wildcard for image sources', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy']
    expect(hasBareHttpsSource(getDirective(csp, 'img-src'))).toBe(false)
  })

  test('does not allow bare https wildcard for connection sources', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy']
    expect(hasBareHttpsSource(getDirective(csp, 'connect-src'))).toBe(false)
  })

  test('allows explicitly configured image origins without enabling all https origins', () => {
    const csp = createSecurityCsp({
      sources: {
        imgOrigins: ['https://api.qrserver.com', 'https://cdn.example.com/path/ignored'],
      },
    })
    const imgDirective = getDirective(csp, 'img-src')

    expect(hasBareHttpsSource(imgDirective)).toBe(false)
    expect(imgDirective).toContain('https://api.qrserver.com')
    expect(imgDirective).toContain('https://cdn.example.com')
    expect(imgDirective).not.toContain('/path/ignored')
  })

  test('allows explicitly configured connection origins without enabling all https origins', () => {
    const csp = createSecurityCsp({
      sources: {
        apiBaseUrl: 'https://api.example.com/api',
        sentryDsn: 'https://abc@sentry.example.com/1',
        connectOrigins: ['https://download.example.com/files/result.docx'],
      },
    })
    const connectDirective = getDirective(csp, 'connect-src')

    expect(hasBareHttpsSource(connectDirective)).toBe(false)
    expect(connectDirective).toContain('https://api.example.com')
    expect(connectDirective).toContain('https://sentry.example.com')
    expect(connectDirective).toContain('https://download.example.com')
    expect(connectDirective).not.toContain('/files/result.docx')
  })

  test('keeps frame-ancestors in headers but out of meta csp', () => {
    const headerCsp = SECURITY_HEADERS['Content-Security-Policy']
    expect(headerCsp).toContain("frame-ancestors 'none'")
    expect(SECURITY_META_CSP).not.toContain('frame-ancestors')
  })

  test('keeps local development origins out of production policies', () => {
    expect(SECURITY_META_CSP).not.toMatch(/localhost|127\.0\.0\.1/)
    expect(SECURITY_HEADERS['Content-Security-Policy']).not.toMatch(/localhost|127\.0\.0\.1/)
  })

  test('allows local origins only in the explicit development policy', () => {
    expect(SECURITY_DEV_CSP).toContain('http://127.0.0.1:*')
    expect(SECURITY_DEV_CSP).toContain('ws://localhost:*')
  })

  test('restricts form submissions and framing in the applicable policy surfaces', () => {
    expect(SECURITY_META_CSP).toContain("form-action 'self'")
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("form-action 'self'")
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY')
  })
})
