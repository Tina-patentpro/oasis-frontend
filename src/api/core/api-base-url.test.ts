/* global describe, expect, test */
import { resolveApiBaseUrl } from './api-base-url'

describe('resolveApiBaseUrl', () => {
  test('uses the local proxy in dev mode', () => {
    expect(
      resolveApiBaseUrl(
        { DEV: true, VITE_API_BASE_URL: 'https://lzhxpy.oasisintwrite.com/api' },
        { hostname: 'oasisintwrite.com' },
      ),
    ).toBe('/api')
  })

  test('uses the local proxy for production preview on loopback hosts', () => {
    expect(
      resolveApiBaseUrl(
        { DEV: false, VITE_API_BASE_URL: 'https://lzhxpy.oasisintwrite.com/api' },
        { hostname: '127.0.0.1' },
      ),
    ).toBe('/api')
  })

  test('uses the configured remote API on non-local production hosts', () => {
    expect(
      resolveApiBaseUrl(
        { DEV: false, VITE_API_BASE_URL: 'https://lzhxpy.oasisintwrite.com/api' },
        { hostname: 'oasisintwrite.com' },
      ),
    ).toBe('https://lzhxpy.oasisintwrite.com/api')
  })
})
