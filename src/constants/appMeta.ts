import packageJson from '../../package.json'

const FALLBACK_APP_VERSION =
  typeof packageJson.version === 'string' && packageJson.version.trim().length > 0
    ? packageJson.version.trim()
    : '0.0.0'
const globalWithAppVersion = globalThis as typeof globalThis & { __APP_VERSION__?: string }
const INJECTED_APP_VERSION =
  typeof globalWithAppVersion.__APP_VERSION__ === 'string' &&
  globalWithAppVersion.__APP_VERSION__.trim().length > 0
    ? globalWithAppVersion.__APP_VERSION__.trim()
    : null

export const APP_VERSION = FALLBACK_APP_VERSION === '0.0.0' ? INJECTED_APP_VERSION || '0.0.0' : FALLBACK_APP_VERSION
export const APP_VERSION_LABEL = `v${APP_VERSION}`
