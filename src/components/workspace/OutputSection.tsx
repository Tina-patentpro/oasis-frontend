import {
  lazy,
  memo,
  Profiler,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react'

import { useThemeStore } from '@/stores'

import { LoadingSpinner } from '../ui'
import { ComponentErrorBoundary } from '../error-boundaries/ComponentErrorBoundary'
import { OutputSectionHeader } from './output-section/OutputSectionHeader'
import '@/styles/outputSectionHeader.css'

const LazyContentRenderer = lazy(() =>
  import('../ContentRenderer').then((module) => ({
    default: module.ContentRenderer,
  })),
)
const MemoizedLazyContentRenderer = memo(LazyContentRenderer)

interface OutputSectionProps {
  generated: string
  isGenerating: boolean
  generationStatus: 'idle' | 'queued' | 'running' | 'partial_success' | 'failed' | 'success'
  renderMode: 'rich' | 'source'
  appliedLayout: string
  canGenerate: boolean
  generateDisabled: boolean
  isAsyncWorkflow: boolean
  themeColor: string
  downloadableCount: number
  onGenerate: () => void
  onCopy: () => void
  onDownload: () => void
  onNextStep: () => void
  onRenderModeChange: (mode: 'rich' | 'source') => void
  performanceMetrics: {
    token: string | null
    responseMs: number | null
    interfaceMs: number | null
    firstFrameMs: number | null
    renderMs: number | null
    setGeneratedAtMs: number | null
  }
  onFirstFrameMeasured: (token: string, firstFrameMs: number) => void
  onRenderMeasured: (token: string, renderMs: number) => void
}

export const OutputSection = memo<OutputSectionProps>(
  ({
    generated,
    isGenerating,
    generationStatus,
    renderMode,
    appliedLayout,
    canGenerate,
    generateDisabled,
    isAsyncWorkflow,
    themeColor,
    downloadableCount,
    onGenerate,
    onCopy,
    onDownload,
    onNextStep,
    onRenderModeChange,
    performanceMetrics,
    onFirstFrameMeasured,
    onRenderMeasured,
  }) => {
    const firstFrameMeasuredTokenRef = useRef<string | null>(null)
    const renderMeasuredTokenRef = useRef<string | null>(null)

    const currentTheme = useThemeStore((state) => state.currentTheme)
    const themePrimary = currentTheme.primary
    const themeHover = currentTheme.primaryHover
    const themeBorder = `${themePrimary}26`
    const themeSoft = `${themePrimary}14`
    const themeShadow = `${themePrimary}30`
    const isVerticalLayout = appliedLayout === 'vertical'
    const hasText = generated?.trim().length > 0
    const showSyncGeneratingGuidance =
      !hasText &&
      !isAsyncWorkflow &&
      (isGenerating || generationStatus === 'queued' || generationStatus === 'running')
    const downloadDisabled = downloadableCount === 0
    const downloadTooltip =
      downloadableCount > 0 ? `下载生成文件（${downloadableCount} 个）` : '暂无可下载文件'
    const generateTooltip = !canGenerate
      ? '请先填写输入内容'
      : generateDisabled
        ? isAsyncWorkflow
          ? '当前会话正在生成中，请等待完成或新建会话'
          : '当前会话正在生成中，请等待完成后再开启新会话'
        : '生成新的文档内容'

    const containerClasses = [
      isVerticalLayout
        ? 'w-full'
        : appliedLayout === 'horizontal' || appliedLayout === 'contrast'
          ? 'flex-1 min-w-[320px]'
          : 'flex-1 w-full',
      'flex flex-col',
      isVerticalLayout ? '' : 'min-h-0',
    ]
      .filter(Boolean)
      .join(' ')

    const formatMetricValue = useCallback((value: number | null): string => {
      if (value === null || Number.isNaN(value)) {
        return '--'
      }
      return `${Math.max(0, Math.round(value))}ms`
    }, [])

    const generationStatusMeta = useMemo(() => {
      if (generationStatus === 'queued') {
        return { label: '排队中', className: 'bg-amber-50 text-amber-700 border-amber-200' }
      }
      if (generationStatus === 'running') {
        return { label: '运行中', className: 'bg-blue-50 text-blue-700 border-blue-200' }
      }
      if (generationStatus === 'partial_success') {
        return { label: '部分成功', className: 'bg-amber-50 text-amber-700 border-amber-200' }
      }
      if (generationStatus === 'failed') {
        return { label: '失败', className: 'bg-red-50 text-red-700 border-red-200' }
      }
      if (generationStatus === 'success') {
        return {
          label: '成功',
          className:
            'bg-[var(--theme-light)] text-[var(--theme-primary)] border-[var(--theme-border)]',
        }
      }
      return { label: '待执行', className: 'bg-gray-50 text-gray-600 border-gray-200' }
    }, [generationStatus])

    const guidanceCardStyle = useMemo<CSSProperties>(
      () => ({
        borderColor: themeBorder,
        background: `linear-gradient(180deg, ${themeSoft}, #ffffff)`,
        boxShadow: `0 18px 40px -28px ${themeShadow}`,
      }),
      [themeBorder, themeShadow, themeSoft],
    )

    const pendingGuidance = useMemo(() => {
      if (!showSyncGeneratingGuidance) {
        return null
      }

      return {
        title: '正在生成，请耐心等待',
        description: '当前为同步工作流，请等待本次生成结束后再开启新会话',
      }
    }, [showSyncGeneratingGuidance])

    useEffect(() => {
      if (!hasText) {
        return
      }
      const token = performanceMetrics.token
      const setGeneratedAtMs = performanceMetrics.setGeneratedAtMs
      if (!token || setGeneratedAtMs === null || performanceMetrics.firstFrameMs !== null) {
        return
      }
      if (firstFrameMeasuredTokenRef.current === token) {
        return
      }

      let raf1 = 0
      let raf2 = 0
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          firstFrameMeasuredTokenRef.current = token
          onFirstFrameMeasured(token, performance.now() - setGeneratedAtMs)
        })
      })

      return () => {
        window.cancelAnimationFrame(raf1)
        window.cancelAnimationFrame(raf2)
      }
    }, [
      hasText,
      onFirstFrameMeasured,
      performanceMetrics.firstFrameMs,
      performanceMetrics.setGeneratedAtMs,
      performanceMetrics.token,
    ])

    const handleRichRenderProfile = useCallback(
      (_id: string, _phase: 'mount' | 'update', actualDuration: number) => {
        if (renderMode !== 'rich' || !hasText) {
          return
        }
        const token = performanceMetrics.token
        if (!token || performanceMetrics.renderMs !== null) {
          return
        }
        if (renderMeasuredTokenRef.current === token) {
          return
        }
        renderMeasuredTokenRef.current = token
        onRenderMeasured(token, actualDuration)
      },
      [
        hasText,
        onRenderMeasured,
        performanceMetrics.renderMs,
        performanceMetrics.token,
        renderMode,
      ],
    )
    const richContentRenderer = useMemo(
      () => (
        <MemoizedLazyContentRenderer
          content={generated}
          className={isVerticalLayout ? '' : 'h-full'}
          renderMode={renderMode}
        />
      ),
      [generated, isVerticalLayout, renderMode],
    )

    return (
      <div className={containerClasses}>
        <div
          className={`relative flex flex-col ${
            isVerticalLayout ? '' : 'flex-1 min-h-0'
          } overflow-hidden`}
        >
          <OutputSectionHeader
            generationStatusMeta={generationStatusMeta}
            renderMode={renderMode}
            onRenderModeChange={onRenderModeChange}
            onGenerate={onGenerate}
            onCopy={onCopy}
            onDownload={onDownload}
            onNextStep={onNextStep}
            generateDisabled={generateDisabled}
            isGenerating={isGenerating}
            themeColor={themeColor}
            themeHover={themeHover}
            themePrimary={themePrimary}
            themeBorder={themeBorder}
            themeSoft={themeSoft}
            themeShadow={themeShadow}
            generateTooltip={generateTooltip}
            hasText={hasText}
            downloadDisabled={downloadDisabled}
            downloadTooltip={downloadTooltip}
            downloadableCount={downloadableCount}
          />

          {/* Scrollable preview body */}
          <div
            className={`flex flex-col gap-3 pt-3 ${
              isVerticalLayout ? '' : 'flex-1 min-h-0 overflow-y-auto'
            }`}
          >
            <div className={isVerticalLayout ? 'w-full' : 'flex-1 min-h-0'}>
              {!hasText ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
                  {pendingGuidance ? (
                    <div
                      className="w-full max-w-md rounded-3xl border px-6 py-7 text-center text-gray-600"
                      style={guidanceCardStyle}
                    >
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--theme-primary)] shadow-sm">
                        <LoadingSpinner size="md" />
                      </div>
                      <p className="text-base font-semibold text-gray-800">
                        {pendingGuidance.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        {pendingGuidance.description}
                      </p>
                    </div>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        width="48"
                        height="48"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="mb-4"
                      >
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293H19a2 2 0 012-2v-7a2 2 0 01-2-2h-3.586a1 1 0 01-.707-.293l-5.414-5.414A1 1 0 015 6H5z" />
                      </svg>
                      <p className="text-center text-sm">
                        暂无生成内容，请点击上方
                        <span className="text-primary-600 font-medium">✨ 生成</span>
                        按钮开始
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <Suspense
                  fallback={
                    <div className="h-full whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
                      {generated}
                    </div>
                  }
                >
                  <ComponentErrorBoundary
                    componentName="WorkspaceOutput.ContentRenderer"
                    maxRetries={1}
                    fallbackComponent={({ error, reset }) => (
                      <div className="workspace-output-render-error p-3 rounded-md border border-red-100 bg-red-50 text-sm text-red-700">
                        <div className="mb-2 font-medium">右侧内容渲染异常</div>
                        <pre className="text-xs whitespace-pre-wrap break-words">
                          {error.message}
                        </pre>
                        <button type="button" className="mt-2 text-xs underline" onClick={reset}>
                          重新尝试
                        </button>
                      </div>
                    )}
                  >
                    <Profiler id="workspace-output-rich-render" onRender={handleRichRenderProfile}>
                      {richContentRenderer}
                    </Profiler>
                  </ComponentErrorBoundary>
                </Suspense>
              )}
            </div>
            <div className="border-t border-gray-100 pt-2 text-xs text-gray-500">
              响应: {formatMetricValue(performanceMetrics.responseMs)} | 接口:{' '}
              {formatMetricValue(performanceMetrics.interfaceMs)} | 首帧:{' '}
              {formatMetricValue(performanceMetrics.firstFrameMs)} | 渲染:{' '}
              {formatMetricValue(performanceMetrics.renderMs)}
            </div>
          </div>
        </div>
      </div>
    )
  },
)

OutputSection.displayName = 'OutputSection'
