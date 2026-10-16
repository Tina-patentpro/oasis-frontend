import { useCallback, useEffect, useRef, useState } from 'react'

import { cmsService } from '@/api/services'
import type { CategoriesResponse } from '@/types/api'

import type { DynamicTabsDataState } from './types'

const CATEGORIES_CACHE_TTL_MS = 60_000
const CATEGORIES_STORAGE_KEY = 'oasis-categories-cache'
const CATEGORIES_STORAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

let categoriesCache: { data: CategoriesResponse; expiresAt: number } | null = null
let categoriesInFlight: Promise<CategoriesResponse> | null = null

// Prune expired localStorage cache on module load (guarded for SSR / sandboxed iframe)
try {
  const raw = globalThis.localStorage?.getItem(CATEGORIES_STORAGE_KEY)
  if (raw) {
    const parsed = JSON.parse(raw) as { data: CategoriesResponse; savedAt: number } | null
    if (parsed?.savedAt && Date.now() - parsed.savedAt > CATEGORIES_STORAGE_MAX_AGE_MS) {
      globalThis.localStorage?.removeItem(CATEGORIES_STORAGE_KEY)
    }
  }
} catch {
  // cached categories data is corrupt / unavailable — fall through to return null
}

function hasCategoryData(result: CategoriesResponse | null): boolean {
  if (!result || typeof result !== 'object') {
    return false
  }
  return Object.entries(result as Record<string, unknown>).some(([, value]) => {
    if (!Array.isArray(value) || value.length === 0) {
      return false
    }
    return value.some(
      (item) =>
        !!item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string',
    )
  })
}

function readCategoriesCache(): CategoriesResponse | null {
  if (!categoriesCache) {
    return null
  }
  if (categoriesCache.expiresAt <= Date.now()) {
    categoriesCache = null
    return null
  }
  return categoriesCache.data
}

function readStaleFromStorage(): CategoriesResponse | null {
  try {
    const raw = globalThis.localStorage?.getItem(CATEGORIES_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data: CategoriesResponse; savedAt: number } | null
    if (!parsed?.data || Date.now() - parsed.savedAt > CATEGORIES_STORAGE_MAX_AGE_MS) return null
    return hasCategoryData(parsed.data) ? parsed.data : null
  } catch {
    return null
  }
}

function persistToStorage(data: CategoriesResponse): void {
  try {
    globalThis.localStorage?.setItem(
      CATEGORIES_STORAGE_KEY,
      JSON.stringify({ data, savedAt: Date.now() }),
    )
  } catch {
    // localStorage full or disabled
  }
}

async function fetchCategoriesShared(force: boolean): Promise<CategoriesResponse> {
  if (!force) {
    const cached = readCategoriesCache()
    if (cached) {
      return cached
    }
    if (categoriesInFlight) {
      return categoriesInFlight
    }
  }

  const request = cmsService
    .getCategories()
    .then((result) => {
      if (hasCategoryData(result)) {
        categoriesCache = {
          data: result,
          expiresAt: Date.now() + CATEGORIES_CACHE_TTL_MS,
        }
        persistToStorage(result)
      }
      return result
    })
    .finally(() => {
      if (categoriesInFlight === request) {
        categoriesInFlight = null
      }
    })

  categoriesInFlight = request
  return request
}

export function useCategoriesData() {
  const isInitialized = useRef(false)
  const retryCountRef = useRef(0)
  const [state, setState] = useState<DynamicTabsDataState<CategoriesResponse>>({
    isLoading: false,
    data: null,
    error: null,
    isStale: false,
  })

  const fetchCategories = useCallback(async (force: boolean) => fetchCategoriesShared(force), [])

  const loadData = useCallback(
    async (options: { logError: boolean; force: boolean }) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }))
        const result = await fetchCategories(options.force)
        if (!hasCategoryData(result)) {
          throw new Error('Empty categories payload')
        }
        retryCountRef.current = 0
        setState({ isLoading: false, data: result, error: null, isStale: false })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        if (options.logError) {
          console.error('[useDynamicTabs] Failed to load data:', error)
        }
        // 优先使用过期 localStorage 缓存，避免白屏
        // 但保留 error 引用，确保重试 effect 不会被 data 存在所短路
        const staleData = readStaleFromStorage()
        if (staleData) {
          setState({ isLoading: false, data: staleData, error, isStale: true })
        } else {
          setState((prev) => ({ ...prev, isLoading: false, error }))
        }
      }
    },
    [fetchCategories],
  )

  useEffect(() => {
    if (isInitialized.current) {
      return
    }
    isInitialized.current = true

    void loadData({ logError: true, force: false })
  }, [loadData])

  useEffect(() => {
    if (!state.error || state.isLoading) {
      return
    }
    if (retryCountRef.current >= 3) {
      return
    }

    retryCountRef.current += 1
    const delayMs = Math.min(1200 * retryCountRef.current, 5000)
    const timerId = window.setTimeout(() => {
      void loadData({ logError: true, force: false })
    }, delayMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [loadData, state.data, state.error, state.isLoading])

  const refresh = useCallback(() => {
    retryCountRef.current = 0
    void loadData({ logError: false, force: true })
  }, [loadData])

  return {
    ...state,
    refresh,
  }
}
