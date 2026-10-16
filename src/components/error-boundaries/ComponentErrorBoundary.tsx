import { Component, type ErrorInfo, type ReactNode } from 'react'

import { classifyError, getFriendlyErrorMessage, isDynamicImportError } from './types'

interface ComponentErrorBoundaryProps {
  children: ReactNode
  componentName?: string
  errorStage?: string
  chunkName?: string
  enableRetry?: boolean
  maxRetries?: number
  fallbackComponent?: (props: {
    error: Error
    reset: () => void
    retry: () => void
    retryCount: number
  }) => ReactNode
}

interface ComponentErrorBoundaryState {
  hasError: boolean
  error: Error | null
  retryCount: number
}

function isDevelopmentRuntime(): boolean {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production'
  }
  if (typeof window !== 'undefined') {
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
  }
  return false
}

function shouldReportErrors(): boolean {
  return typeof process === 'undefined' || process.env.NODE_ENV !== 'test'
}

/**
 * 组件级错误边界
 * 捕获组件级错误，提供内联降级UI和重试机制
 */
export class ComponentErrorBoundary extends Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<ComponentErrorBoundaryState> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorType = classifyError(error)
    const { chunkName, componentName, errorStage } = this.props

    console.error(`[ComponentErrorBoundary] ${componentName || '组件'}错误:`, error, errorInfo)

    if (shouldReportErrors()) {
      import('@/monitoring')
        .then(({ reportError }) => {
          reportError(error, {
            componentStack: errorInfo.componentStack ?? undefined,
            extra: {
              phase: 'render',
              errorType,
              errorName: error.name,
              errorMessage: error.message,
              componentName,
              errorStage,
              chunkName,
              isDynamicImportError: isDynamicImportError(error),
              retryCount: this.state.retryCount,
            },
            tags: {
              boundary: 'component',
              errorType,
              componentName: componentName || 'unknown',
              errorStage: errorStage || 'render',
              chunkName: chunkName || 'unknown',
            },
          })
        })
        .catch((reportingError) => {
          console.warn('[ComponentErrorBoundary] failed to report component error:', reportingError)
        })
    }
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null, retryCount: 0 })
  }

  retryError = (): void => {
    const { maxRetries = 3 } = this.props
    const newRetryCount = this.state.retryCount + 1

    if (newRetryCount <= maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        retryCount: newRetryCount,
      })
    }
  }

  override render(): ReactNode {
    const { enableRetry = true, maxRetries = 3, componentName } = this.props

    if (this.state.hasError && this.state.error) {
      // 使用自定义降级组件
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent({
          error: this.state.error,
          reset: this.resetError,
          retry: this.retryError,
          retryCount: this.state.retryCount,
        })
      }

      // 默认内联降级UI
      const friendlyMessage = getFriendlyErrorMessage(this.state.error)
      const canRetry = enableRetry && this.state.retryCount < maxRetries
      const isDev = isDevelopmentRuntime()

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-2">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900 mb-1">
                {componentName || '组件'}加载失败
              </h3>
              <p className="text-sm text-red-700 mb-2">{friendlyMessage}</p>

              {isDev && this.state.error && (
                <details className="mb-2">
                  <summary className="text-xs text-red-600 cursor-pointer">技术详情</summary>
                  <pre className="mt-1 text-xs text-red-600 overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                {canRetry && (
                  <button
                    type="button"
                    onClick={this.retryError}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    重试 {this.state.retryCount > 0 && `(${this.state.retryCount}/${maxRetries})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={this.resetError}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
