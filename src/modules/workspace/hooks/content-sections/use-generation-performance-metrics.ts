import { useCallback, useState } from 'react'

export type GenerationPerformanceMetrics = {
  token: string | null
  responseMs: number | null
  interfaceMs: number | null
  firstFrameMs: number | null
  renderMs: number | null
  setGeneratedAtMs: number | null
}

const EMPTY_PERFORMANCE_METRICS: GenerationPerformanceMetrics = {
  token: null,
  responseMs: null,
  interfaceMs: null,
  firstFrameMs: null,
  renderMs: null,
  setGeneratedAtMs: null,
}

export function useGenerationPerformanceMetrics() {
  const [performanceMetrics, setPerformanceMetrics] =
    useState<GenerationPerformanceMetrics>(EMPTY_PERFORMANCE_METRICS)

  const resetPerformanceMetrics = useCallback(() => {
    setPerformanceMetrics(EMPTY_PERFORMANCE_METRICS)
  }, [])

  const handleMetricsStart = useCallback((token: string) => {
    setPerformanceMetrics({
      token,
      responseMs: null,
      interfaceMs: null,
      firstFrameMs: null,
      renderMs: null,
      setGeneratedAtMs: null,
    })
  }, [])

  const handleMetricsCollected = useCallback(
    (metrics: {
      token: string
      responseMs: number
      interfaceMs: number
      setGeneratedAtMs: number
    }) => {
      setPerformanceMetrics((prev) => {
        if (prev.token && prev.token !== metrics.token) {
          return prev
        }
        return {
          token: metrics.token,
          responseMs: metrics.responseMs,
          interfaceMs: metrics.interfaceMs,
          firstFrameMs: prev.firstFrameMs,
          renderMs: prev.renderMs,
          setGeneratedAtMs: metrics.setGeneratedAtMs,
        }
      })
    },
    [],
  )

  const handleFirstFrameMeasured = useCallback((token: string, firstFrameMs: number) => {
    setPerformanceMetrics((prev) => {
      if (prev.token !== token) {
        return prev
      }
      return {
        ...prev,
        firstFrameMs,
      }
    })
  }, [])

  const handleRenderMeasured = useCallback((token: string, renderMs: number) => {
    setPerformanceMetrics((prev) => {
      if (prev.token !== token) {
        return prev
      }
      return {
        ...prev,
        renderMs,
      }
    })
  }, [])

  return {
    performanceMetrics,
    resetPerformanceMetrics,
    handleMetricsStart,
    handleMetricsCollected,
    handleFirstFrameMeasured,
    handleRenderMeasured,
  }
}
