import { afterEach, describe, expect, jest, test } from '@jest/globals'

type GlobalWithAppVersion = typeof globalThis & { __APP_VERSION__?: string }

const appVersionGlobal = globalThis as GlobalWithAppVersion
const originalAppVersion = appVersionGlobal.__APP_VERSION__

afterEach(() => {
  jest.resetModules()
  jest.dontMock('../../package.json')

  if (typeof originalAppVersion === 'string') {
    appVersionGlobal.__APP_VERSION__ = originalAppVersion
  } else {
    delete appVersionGlobal.__APP_VERSION__
  }
})

describe('appMeta', () => {
  test('uses the package version before a stale injected build version', async () => {
    appVersionGlobal.__APP_VERSION__ = '1.0.2'
    jest.doMock('../../package.json', () => ({
      version: '1.0.5',
    }))

    const { APP_VERSION, APP_VERSION_LABEL } = await import('./appMeta')

    expect(APP_VERSION).toBe('1.0.5')
    expect(APP_VERSION_LABEL).toBe('v1.0.5')
  })

  test('uses the package version when no build version is injected', async () => {
    delete appVersionGlobal.__APP_VERSION__
    jest.doMock('../../package.json', () => ({
      version: '9.9.9',
    }))

    const { APP_VERSION, APP_VERSION_LABEL } = await import('./appMeta')

    expect(APP_VERSION).toBe('9.9.9')
    expect(APP_VERSION_LABEL).toBe('v9.9.9')
  })

  test('falls back to the injected build version when package version is missing', async () => {
    appVersionGlobal.__APP_VERSION__ = '2.3.4'
    jest.doMock('../../package.json', () => ({
      version: '',
    }))

    const { APP_VERSION, APP_VERSION_LABEL } = await import('./appMeta')

    expect(APP_VERSION).toBe('2.3.4')
    expect(APP_VERSION_LABEL).toBe('v2.3.4')
  })
})
