const ACCESS_TOKEN_KEYS = ['access_token', 'accessToken'] as const
const ACCESS_TOKEN_STORAGE_KEY = 'auth_access_token_v1'
const SESSION_RECORD_VERSION = 1
const SESSION_TTL_MS = 1000 * 60 * 60

type PersistedAccessToken = {
  version: number
  token: string
  issuedAt: number
  expiresAt: number
  binding: string
}

let memoryAccessToken: string | null = null
let memoryTokenExpiresAt = 0
let memoryBinding = ''

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== 'undefined'
}

function removeStorageItem(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
}

function getSessionBinding(): string {
  if (typeof navigator === 'undefined') {
    return 'server'
  }
  const language = navigator.language || ''
  const userAgent = navigator.userAgent || ''
  return `${language}|${userAgent}`
}

function isTokenValid(token: string): boolean {
  const normalized = token.trim()
  if (normalized.length < 8 || normalized.length > 4096) {
    return false
  }
  if (/[<>"'`\\\s]/.test(normalized)) {
    return false
  }
  return true
}

function clearLegacyTokenKeys(): void {
  if (typeof localStorage !== 'undefined') {
    removeStorageItem(localStorage, ACCESS_TOKEN_STORAGE_KEY)
    ACCESS_TOKEN_KEYS.forEach((key) => {
      removeStorageItem(localStorage, key)
    })
  }

  if (canUseSessionStorage()) {
    ACCESS_TOKEN_KEYS.forEach((key) => {
      removeStorageItem(sessionStorage, key)
    })
  }
}

function clearPersistedToken(): void {
  if (canUseSessionStorage()) {
    removeStorageItem(sessionStorage, ACCESS_TOKEN_STORAGE_KEY)
  }
  clearLegacyTokenKeys()
}

function isPersistedToken(value: unknown): value is PersistedAccessToken {
  if (!value || typeof value !== 'object') {
    return false
  }
  const record = value as Partial<PersistedAccessToken>
  return (
    record.version === SESSION_RECORD_VERSION &&
    typeof record.token === 'string' &&
    typeof record.issuedAt === 'number' &&
    typeof record.expiresAt === 'number' &&
    typeof record.binding === 'string'
  )
}

function readPersistedToken(): PersistedAccessToken | null {
  clearLegacyTokenKeys()
  if (!canUseSessionStorage()) {
    return null
  }

  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isPersistedToken(parsed)) {
      clearPersistedToken()
      return null
    }
    return parsed
  } catch {
    clearPersistedToken()
    return null
  }
}

function writePersistedToken(record: PersistedAccessToken): void {
  clearLegacyTokenKeys()
  if (!canUseSessionStorage()) {
    return
  }
  try {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Keep the in-memory token as a safe fallback when storage is blocked.
  }
}

function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt
}

function resetMemoryToken(): void {
  memoryAccessToken = null
  memoryTokenExpiresAt = 0
  memoryBinding = ''
}

function cacheMemoryToken(token: string, expiresAt: number, binding: string): void {
  memoryAccessToken = token
  memoryTokenExpiresAt = expiresAt
  memoryBinding = binding
}

function validateRecord(record: PersistedAccessToken): string | null {
  if (!isTokenValid(record.token)) {
    return null
  }

  const now = Date.now()
  if (
    record.issuedAt <= 0 ||
    record.expiresAt <= record.issuedAt ||
    record.issuedAt > now + 30_000
  ) {
    return null
  }
  if (record.expiresAt - record.issuedAt > SESSION_TTL_MS + 30_000) {
    return null
  }
  if (isExpired(record.expiresAt)) {
    return null
  }
  if (record.binding !== getSessionBinding()) {
    return null
  }
  return record.token
}

function resolveActiveRecord(): PersistedAccessToken | null {
  if (
    memoryAccessToken &&
    !isExpired(memoryTokenExpiresAt) &&
    memoryBinding.length > 0 &&
    memoryBinding === getSessionBinding()
  ) {
    return {
      version: SESSION_RECORD_VERSION,
      token: memoryAccessToken,
      issuedAt: memoryTokenExpiresAt - SESSION_TTL_MS,
      expiresAt: memoryTokenExpiresAt,
      binding: memoryBinding,
    }
  }

  resetMemoryToken()
  const persisted = readPersistedToken()
  if (!persisted) {
    return null
  }

  const token = validateRecord(persisted)
  if (!token) {
    clearPersistedToken()
    return null
  }

  cacheMemoryToken(token, persisted.expiresAt, persisted.binding)
  return persisted
}

export function getAccessToken(): string | null {
  const activeRecord = resolveActiveRecord()
  return activeRecord ? activeRecord.token : null
}

export function getAccessTokenExpiryAt(): number | null {
  const activeRecord = resolveActiveRecord()
  return activeRecord ? activeRecord.expiresAt : null
}

export function getAccessTokenRemainingMs(): number | null {
  const expiryAt = getAccessTokenExpiryAt()
  if (!expiryAt) {
    return null
  }
  const remainingMs = expiryAt - Date.now()
  return remainingMs > 0 ? remainingMs : null
}

export function setAccessToken(token: string): void {
  const normalized = token.trim()
  if (!isTokenValid(normalized)) {
    clearAccessToken()
    return
  }

  const activeRecord = resolveActiveRecord()
  if (activeRecord?.token === normalized) {
    return
  }

  const now = Date.now()
  const record: PersistedAccessToken = {
    version: SESSION_RECORD_VERSION,
    token: normalized,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
    binding: getSessionBinding(),
  }

  cacheMemoryToken(record.token, record.expiresAt, record.binding)
  writePersistedToken(record)
}

export function clearAccessToken(): void {
  resetMemoryToken()
  clearPersistedToken()
}

export function __unsafeResetTokenMemoryForTests(): void {
  resetMemoryToken()
}
