import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { cmsService } from '@/api/services'
import { useAsyncToolStore } from '@/stores'
import type { ApiDetail } from '@/types/api'

interface UseApiDetailLoaderParams {
  hydrated: boolean
  toolName: string
  toolVersion: string | null | undefined
  inputSections: Record<string, unknown>
  getApiEndpointForTool: (toolName: string, modelVersion: string) => string | null
}

interface ApiDetailRequest {
  endpoint: string
  promise: Promise<ApiDetail | null>
}

export function useApiDetailLoader({
  hydrated,
  toolName,
  toolVersion,
  inputSections,
  getApiEndpointForTool,
}: UseApiDetailLoaderParams) {
  const [apiDetail, setApiDetail] = useState<ApiDetail | null>(null)
  const [apiDetailEndpoint, setApiDetailEndpoint] = useState<string | null>(null)
  const [apiDetailLoadRequested, setApiDetailLoadRequested] = useState(true)
  const [apiDetailLoaded, setApiDetailLoaded] = useState(false)
  const [apiDetailReloadToken, setApiDetailReloadToken] = useState(0)
  const apiDetailRequestRef = useRef<ApiDetailRequest | null>(null)
  const apiDetailRequestTokenRef = useRef(0)

  const apiEndpoint = useMemo(() => {
    if (!hydrated || !toolName) {
      return null
    }
    if (toolVersion === null || toolVersion === undefined) {
      return null
    }
    return getApiEndpointForTool(toolName, toolVersion)
  }, [getApiEndpointForTool, hydrated, toolName, toolVersion])
  const committedApiEndpointRef = useRef(apiEndpoint)

  const currentApiDetail = useMemo(() => {
    if (!apiDetail || !apiEndpoint) {
      return null
    }
    return apiDetailEndpoint === apiEndpoint ? apiDetail : null
  }, [apiDetail, apiDetailEndpoint, apiEndpoint])

  const fetchApiDetail = useCallback(async (): Promise<ApiDetail | null> => {
    const requestEndpoint = apiEndpoint
    if (committedApiEndpointRef.current !== requestEndpoint) {
      return null
    }

    if (!requestEndpoint) {
      setApiDetail(null)
      setApiDetailEndpoint(null)
      return null
    }

    const currentRequest = apiDetailRequestRef.current
    if (currentRequest?.endpoint === requestEndpoint) {
      return currentRequest.promise
    }

    const token = apiDetailRequestTokenRef.current + 1
    apiDetailRequestTokenRef.current = token

    const requestPromise = cmsService
      .getApiDetail(requestEndpoint)
      .then((detail) => {
        if (
          apiDetailRequestTokenRef.current === token &&
          committedApiEndpointRef.current === requestEndpoint
        ) {
          setApiDetail(detail)
          setApiDetailEndpoint(requestEndpoint)
          setApiDetailLoaded(true)
          useAsyncToolStore
            .getState()
            .setEndpointAsync(requestEndpoint, detail.is_async === 1)
        }
        return detail
      })
      .catch((error: unknown): null => {
        if (
          apiDetailRequestTokenRef.current === token &&
          committedApiEndpointRef.current === requestEndpoint
        ) {
          setApiDetail(null)
          setApiDetailEndpoint(null)
          setApiDetailLoaded(true)
          console.warn('[useWorkspaceContentSections] Failed to load API detail:', error)
        }
        return null
      })
    apiDetailRequestRef.current = {
      endpoint: requestEndpoint,
      promise: requestPromise,
    }
    requestPromise.finally(() => {
      const latestRequest = apiDetailRequestRef.current
      if (
        latestRequest?.endpoint === requestEndpoint &&
        latestRequest.promise === requestPromise
      ) {
        apiDetailRequestRef.current = null
      }
    })
    return requestPromise
  }, [apiEndpoint])

  const ensureApiDetailLoaded = useCallback(async (): Promise<ApiDetail | null> => {
    if (currentApiDetail) {
      return currentApiDetail
    }
    setApiDetailLoadRequested(true)
    return fetchApiDetail()
  }, [currentApiDetail, fetchApiDetail])

  const requestApiDetailLoad = useCallback(() => {
    setApiDetailLoadRequested(true)
  }, [])

  const reloadApiDetail = useCallback(() => {
    setApiDetailLoaded(false)
    void fetchApiDetail()
  }, [fetchApiDetail])

  const resetApiDetailLoad = useCallback(() => {
    apiDetailRequestTokenRef.current += 1
    apiDetailRequestRef.current = null
    setApiDetail(null)
    setApiDetailEndpoint(null)
    setApiDetailLoadRequested(true)
    setApiDetailLoaded(false)
    setApiDetailReloadToken((token) => token + 1)
  }, [])

  useLayoutEffect(() => {
    if (committedApiEndpointRef.current === apiEndpoint) {
      return
    }
    committedApiEndpointRef.current = apiEndpoint
    apiDetailRequestTokenRef.current += 1
    if (apiDetailRequestRef.current?.endpoint !== apiEndpoint) {
      apiDetailRequestRef.current = null
    }
  }, [apiEndpoint])

  useEffect(() => {
    if (apiDetailLoadRequested) {
      return
    }
    const hasInputValue = Object.values(inputSections).some(
      (value) => typeof value === 'string' && value.trim().length > 0,
    )
    if (hasInputValue) {
      queueMicrotask(() => {
        setApiDetailLoadRequested(true)
      })
    }
  }, [apiDetailLoadRequested, inputSections])

  useEffect(() => {
    if (!hydrated || !apiDetailLoadRequested || !apiEndpoint || currentApiDetail) {
      return
    }
    queueMicrotask(() => {
      void fetchApiDetail()
    })
  }, [
    currentApiDetail,
    apiDetailLoadRequested,
    apiDetailReloadToken,
    apiEndpoint,
    fetchApiDetail,
    hydrated,
  ])

  return {
    apiEndpoint,
    currentApiDetail,
    apiDetailLoaded,
    fetchApiDetail,
    ensureApiDetailLoaded,
    requestApiDetailLoad,
    reloadApiDetail,
    resetApiDetailLoad,
  }
}
