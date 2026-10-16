import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import createDOMPurify from 'dompurify'

interface MermaidChartProps {
  chart: string
  id?: string
}

type MermaidLib = typeof import('mermaid')
type MermaidAPI = MermaidLib['default']

let mermaidSingleton: MermaidAPI | null = null
let mermaidLoader: Promise<MermaidAPI> | null = null
let mermaidInitialized = false

type DomPurifyInstance = ReturnType<typeof createDOMPurify>

declare global {
  interface Window {
    DOMPurify?: DomPurifyInstance
  }
}

const UNSAFE_SVG_PATTERN =
  /<script|<foreignObject|on[a-z]+\s*=|(?:xlink:href|href)\s*=\s*["']?\s*javascript:/i

export const sanitizeSvgOutput = (svg: string): string => {
  if (typeof window === 'undefined' || !window.DOMPurify) {
    return ''
  }

  return window.DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover'],
    ALLOW_UNKNOWN_PROTOCOLS: false,
  })
}

const loadMermaid = async (): Promise<MermaidAPI> => {
  if (mermaidSingleton) {
    return mermaidSingleton
  }

  if (!mermaidLoader) {
    mermaidLoader = (async () => {
      try {
        if (typeof window !== 'undefined' && !window.DOMPurify) {
          try {
            const instance = createDOMPurify(window)
            window.DOMPurify = instance
          } catch (error) {
            console.warn('Failed to initialize DOMPurify for Mermaid:', error)
          }
        }
        const module = await import('mermaid')
        const mermaid = module.default ?? (module as unknown as MermaidAPI)
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'strict',
            htmlLabels: false,
            flowchart: {
              htmlLabels: false,
            },
            fontFamily: 'inherit',
            logLevel: 'error',
          })
          mermaidInitialized = true
        }
        mermaidSingleton = mermaid
        return mermaid
      } catch (error) {
        mermaidLoader = null
        console.error('[MermaidChart] failed to import mermaid package', {
          stage: 'mermaid-package-import',
          chunk: 'mermaid',
          errorName: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          error,
        })
        throw error
      }
    })()
  }

  return mermaidLoader
}

/**
 * Stable Mermaid Chart Component
 * Implements multiple strategies to ensure reliable rendering:
 * 1. Uses mermaid.render() API for explicit control
 * 2. Generates unique IDs to avoid conflicts
 * 3. Validates chart syntax before rendering
 * 4. Implements proper cleanup and error handling
 */
export const MermaidChart: React.FC<MermaidChartProps> = ({ chart, id }) => {
  const [svgContent, setSvgContent] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartIdRef = useRef<string>(id || `mermaid-${Math.random().toString(36).substr(2, 9)}`)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Render chart when content changes
  useLayoutEffect(() => {
    // Cancel any pending render
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    const currentAbortController = abortControllerRef.current

    const renderChart = async () => {
      if (!chart || !chart.trim()) {
        setSvgContent('')
        setError('')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')
      const traceId = `${chartIdRef.current}-${Date.now()}`
      let renderStage = 'mermaid-load'

      try {
        const mermaid = await loadMermaid()

        // Validate syntax first
        renderStage = 'mermaid-parse'
        await mermaid.parse(chart)

        // Generate unique ID for this render
        const uniqueId = traceId

        // Render the chart
        renderStage = 'mermaid-render'
        const { svg } = await mermaid.render(uniqueId, chart)
        renderStage = 'mermaid-sanitize'
        const sanitizedSvg = sanitizeSvgOutput(svg)

        if (!sanitizedSvg || UNSAFE_SVG_PATTERN.test(sanitizedSvg)) {
          throw new Error('SVG output contains potentially unsafe content')
        }

        // Only update if not aborted
        if (!currentAbortController.signal.aborted) {
          setSvgContent(sanitizedSvg)
          setError('')
        }
      } catch (err) {
        if (!currentAbortController.signal.aborted) {
          console.error('[MermaidChart] Mermaid rendering error', {
            stage: renderStage,
            traceId,
            chartLength: chart.length,
            errorName: err instanceof Error ? err.name : typeof err,
            errorMessage: err instanceof Error ? err.message : String(err),
            error: err,
          })
          setError('图表语法或内容不符合 Mermaid 要求，请检查后重试。')
          setSvgContent('')
        }
      } finally {
        if (!currentAbortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    renderChart()

    // Cleanup function
    return () => {
      currentAbortController.abort()
    }
  }, [chart])

  // Handle SVG interactions
  useEffect(() => {
    if (!containerRef.current || !svgContent) return

    const container = containerRef.current
    const svg = container.querySelector('svg')

    if (svg) {
      // Make SVG responsive
      svg.style.maxWidth = '100%'
      svg.style.height = 'auto'

      // Enable zoom on click (optional)
      svg.style.cursor = 'pointer'

      const handleClick = () => {
        svg.classList.toggle('zoomed')
      }

      svg.addEventListener('click', handleClick)

      return () => {
        svg.removeEventListener('click', handleClick)
      }
    }
  }, [svgContent])

  if (isLoading) {
    return (
      <div className="mermaid-loading" style={{ padding: '20px', textAlign: 'center' }}>
        <div className="animate-pulse text-gray-500">正在渲染图表…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="mermaid-error"
        style={{
          padding: '12px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c00',
        }}
      >
        <strong>图表渲染失败：</strong> {error}
      </div>
    )
  }

  if (!svgContent) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-chart-container"
      style={{ overflow: 'auto', margin: '16px 0' }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}
