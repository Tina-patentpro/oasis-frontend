function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage
    }
  } catch {
    return null
  }
  return null
}

export function safeGetLocalStorageItem(key: string): string | null {
  const storage = getLocalStorage()
  if (!storage) {
    return null
  }

  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetLocalStorageItem(key: string, value: string): boolean {
  const storage = getLocalStorage()
  if (!storage) {
    return false
  }

  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveLocalStorageItem(key: string): void {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  try {
    storage.removeItem(key)
  } catch {
    // Ignore storage cleanup failures; callers also clear in-memory state.
  }
}

export function safeReadLocalStorageJson<T>(key: string): T | null {
  const raw = safeGetLocalStorageItem(key)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    safeRemoveLocalStorageItem(key)
    return null
  }
}

export function safeSetLocalStorageJson(key: string, value: unknown): boolean {
  try {
    return safeSetLocalStorageItem(key, JSON.stringify(value))
  } catch {
    return false
  }
}
