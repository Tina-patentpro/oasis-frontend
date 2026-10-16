import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { ApiDetail } from '@/types/api'

import { buildDynamicInputSections, buildSectionDefinitions } from './input-sections'

type InputPage = { key: string; label: string }
type DynamicInputSection = ReturnType<typeof buildDynamicInputSections>[number]

interface UseWorkspaceInputPagesParams {
  hydrated: boolean
  currentApiDetail: ApiDetail | null
  resolvedToolId: string
  toolName: string
  toolVersion: string | null | undefined
  pages: InputPage[]
  inputPage: string
  apiEndpoint: string | null
  apiDetailLoaded: boolean
  getInputSections: (toolId: string) => DynamicInputSection[]
  loadToolDetails: (toolId: string) => Promise<unknown>
  setPages: (pages: InputPage[], options?: { preserveInputPage?: boolean }) => void
  setInputPage: (page: string) => void
  setInputSection: (page: string, value: string) => void
  requestApiDetailLoad: () => void
  reloadApiDetail: () => void
}

export function useWorkspaceInputPages({
  hydrated,
  currentApiDetail,
  resolvedToolId,
  toolName,
  toolVersion,
  pages,
  inputPage,
  apiEndpoint,
  apiDetailLoaded,
  getInputSections,
  loadToolDetails,
  setPages,
  setInputPage,
  setInputSection,
  requestApiDetailLoad,
  reloadApiDetail,
}: UseWorkspaceInputPagesParams) {
  const requestedToolDetailsRef = useRef(new Map<string, Promise<unknown>>())
  const resetInputPageOnResolvedPagesRef = useRef(true)
  const retryCountRef = useRef(0)
  const [tabsLoadError, setTabsLoadError] = useState<string | null>(null)
  const [sampleDataCache, setSampleDataCache] = useState<Record<string, null>>({})
  const [previousPagesCache, setPreviousPagesCache] = useState<Record<string, InputPage[]>>({})
  const currentPagesCacheKey = useMemo(
    () => `${toolName}:${toolVersion ?? '_'}`,
    [toolName, toolVersion],
  )
  const currentInputPagesIdentity = useMemo(
    () => JSON.stringify([toolName, toolVersion ?? null, resolvedToolId, apiEndpoint]),
    [apiEndpoint, resolvedToolId, toolName, toolVersion],
  )
  const mountedRef = useRef(false)
  const committedInputPagesIdentityRef = useRef(currentInputPagesIdentity)
  const inputPagesGenerationRef = useRef(0)

  useLayoutEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useLayoutEffect(() => {
    if (committedInputPagesIdentityRef.current === currentInputPagesIdentity) {
      return
    }
    committedInputPagesIdentityRef.current = currentInputPagesIdentity
    inputPagesGenerationRef.current += 1
  }, [currentInputPagesIdentity])

  const isCurrentInputPagesCommit = useCallback((identity: string, generation: number) => {
    return (
      mountedRef.current &&
      committedInputPagesIdentityRef.current === identity &&
      inputPagesGenerationRef.current === generation
    )
  }, [])

  const dynamicInputSections = useMemo(
    () => buildDynamicInputSections(currentApiDetail),
    [currentApiDetail],
  )

  const rawCmsInputSections = useMemo(() => {
    if (dynamicInputSections.length > 0) {
      return dynamicInputSections
    }
    return getInputSections(resolvedToolId)
  }, [dynamicInputSections, getInputSections, resolvedToolId])

  const cmsInputSections = useMemo(() => rawCmsInputSections, [rawCmsInputSections])
  const sectionDefinitions = useMemo(
    () => buildSectionDefinitions(rawCmsInputSections, cmsInputSections),
    [cmsInputSections, rawCmsInputSections],
  )
  const hasSampleEntry = Object.prototype.hasOwnProperty.call(sampleDataCache, resolvedToolId)

  const rememberInputPages = useCallback(
    (nextPages: InputPage[]) => {
      if (nextPages.length === 0 || !toolName) {
        return
      }

      setPreviousPagesCache((prev) => {
        const nextCache = {
          ...prev,
          [currentPagesCacheKey]: nextPages.map((page) => ({
            key: page.key,
            label: page.label,
          })),
        }
        const keys = Object.keys(nextCache)
        if (keys.length <= 20) {
          return nextCache
        }
        for (let i = 0; i < keys.length - 20; i++) {
          delete nextCache[keys[i]]
        }
        return nextCache
      })
    },
    [currentPagesCacheKey, toolName],
  )

  const applyInputPages = useCallback(
    (nextPages: InputPage[], preserveInputPage = true) => {
      rememberInputPages(nextPages)
      setPages(nextPages, { preserveInputPage })
    },
    [rememberInputPages, setPages],
  )

  const applyResolvedInputPages = useCallback(
    (nextPages: InputPage[]) => {
      const shouldResetToFirstPage = resetInputPageOnResolvedPagesRef.current
      applyInputPages(nextPages, !shouldResetToFirstPage)
      if (shouldResetToFirstPage) {
        resetInputPageOnResolvedPagesRef.current = false
      }
    },
    [applyInputPages],
  )

  useEffect(() => {
    const identity = currentInputPagesIdentity
    const generation = inputPagesGenerationRef.current
    let cancelled = false
    resetInputPageOnResolvedPagesRef.current = true
    retryCountRef.current = 0
    queueMicrotask(() => {
      if (cancelled || !isCurrentInputPagesCommit(identity, generation)) {
        return
      }
      setTabsLoadError(null)
    })
    return () => {
      cancelled = true
    }
  }, [currentInputPagesIdentity, isCurrentInputPagesCommit, toolName, toolVersion])

  useEffect(() => {
    if (!hydrated || !resolvedToolId || hasSampleEntry) {
      return
    }

    const identity = currentInputPagesIdentity
    const generation = inputPagesGenerationRef.current
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled || !isCurrentInputPagesCommit(identity, generation)) {
        return
      }
      setSampleDataCache((prev) => ({
        ...prev,
        [resolvedToolId]: null,
      }))
    })
    return () => {
      cancelled = true
    }
  }, [
    currentInputPagesIdentity,
    hasSampleEntry,
    hydrated,
    isCurrentInputPagesCommit,
    resolvedToolId,
  ])

  useEffect(() => {
    const identity = currentInputPagesIdentity
    const generation = inputPagesGenerationRef.current
    let cancelled = false
    const canCommit = () =>
      !cancelled && isCurrentInputPagesCommit(identity, generation)
    const applyIfCurrent = (nextPages: InputPage[]) => {
      if (canCommit()) {
        applyResolvedInputPages(nextPages)
      }
    }
    const cancel = () => {
      cancelled = true
    }

    if (!hydrated) {
      return cancel
    }

    if (currentApiDetail && Array.isArray(currentApiDetail.input_schema)) {
      const nextPages = dynamicInputSections.map((section) => ({
        key: section.key,
        label: section.label,
      }))
      queueMicrotask(() => {
        applyIfCurrent(nextPages)
      })
      return cancel
    }

    if (rawCmsInputSections.length > 0) {
      const nextPages = cmsInputSections.map((section) => ({
        key: section.key,
        label: section.label,
      }))
      queueMicrotask(() => {
        applyIfCurrent(nextPages)
      })
      return cancel
    }

    if (resolvedToolId === toolName) {
      return cancel
    }

    let request = requestedToolDetailsRef.current.get(resolvedToolId)
    if (!request) {
      request = loadToolDetails(resolvedToolId)
      requestedToolDetailsRef.current.set(resolvedToolId, request)
      const clearRequest = () => {
        if (requestedToolDetailsRef.current.get(resolvedToolId) === request) {
          requestedToolDetailsRef.current.delete(resolvedToolId)
        }
      }
      void request.then(clearRequest, clearRequest)
    }
    void request
      .then(() => {
        if (!canCommit()) {
          return
        }
        const refreshed = getInputSections(resolvedToolId)
        if (refreshed.length > 0) {
          applyIfCurrent(
            refreshed.map((section) => ({ key: section.key, label: section.label })),
          )
        }
      })
      .catch((error) => {
        if (canCommit()) {
          console.warn('[useWorkspaceContentSections] 加载输入配置失败', error)
        }
      })
    return cancel
  }, [
    applyResolvedInputPages,
    currentApiDetail,
    currentInputPagesIdentity,
    cmsInputSections,
    dynamicInputSections,
    getInputSections,
    hydrated,
    isCurrentInputPagesCommit,
    loadToolDetails,
    rawCmsInputSections,
    resolvedToolId,
    toolName,
  ])

  const activePages = useMemo(() => {
    if (pages.length > 0) {
      return pages
    }
    if (currentApiDetail && Array.isArray(currentApiDetail.input_schema)) {
      return []
    }
    const cached = previousPagesCache[currentPagesCacheKey]
    if (apiEndpoint && !apiDetailLoaded) {
      return cached && cached.length > 0 ? cached : []
    }
    return cached && cached.length > 0 ? cached : []
  }, [
    apiDetailLoaded,
    apiEndpoint,
    currentApiDetail,
    currentPagesCacheKey,
    pages,
    previousPagesCache,
  ])

  useEffect(() => {
    const identity = currentInputPagesIdentity
    const generation = inputPagesGenerationRef.current
    let cancelled = false
    const canCommit = () =>
      !cancelled && isCurrentInputPagesCommit(identity, generation)
    const cancel = () => {
      cancelled = true
    }

    if (!hydrated || pages.length > 0 || !apiEndpoint || !apiDetailLoaded) {
      retryCountRef.current = 0
      queueMicrotask(() => {
        if (canCommit()) {
          setTabsLoadError(null)
        }
      })
      return cancel
    }
    if (currentApiDetail) {
      retryCountRef.current = 0
      queueMicrotask(() => {
        if (canCommit()) {
          setTabsLoadError(null)
        }
      })
      return cancel
    }
    if (retryCountRef.current >= 3) {
      queueMicrotask(() => {
        if (canCommit()) {
          setTabsLoadError('标签页加载失败，请检查网络连接后重试')
        }
      })
      return cancel
    }
    retryCountRef.current += 1
    const timer = setTimeout(() => {
      if (canCommit()) {
        reloadApiDetail()
      }
    }, 1000 * retryCountRef.current)
    return () => {
      cancel()
      clearTimeout(timer)
    }
  }, [
    apiDetailLoaded,
    apiEndpoint,
    currentApiDetail,
    currentInputPagesIdentity,
    hydrated,
    isCurrentInputPagesCommit,
    pages.length,
    reloadApiDetail,
  ])

  const retryLoadTabs = useCallback(() => {
    retryCountRef.current = 0
    setTabsLoadError(null)
    reloadApiDetail()
  }, [reloadApiDetail])

  useEffect(() => {
    if (activePages.length === 0) {
      return
    }
    if (activePages.some((page) => page.key === inputPage)) {
      return
    }
    setInputPage(activePages[0].key)
  }, [activePages, inputPage, setInputPage])

  const handleInputPageChange = useCallback(
    (page: string) => {
      requestApiDetailLoad()
      setInputPage(page)
    },
    [requestApiDetailLoad, setInputPage],
  )

  const handleInputSectionChange = useCallback(
    (page: string, value: string) => {
      requestApiDetailLoad()
      setInputSection(page, value)
    },
    [requestApiDetailLoad, setInputSection],
  )

  return {
    dynamicInputSections,
    rawCmsInputSections,
    cmsInputSections,
    sectionDefinitions,
    activePages,
    tabsLoadError,
    retryLoadTabs,
    handleInputPageChange,
    handleInputSectionChange,
  }
}
