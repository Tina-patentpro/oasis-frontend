import { Component, type ErrorInfo, type ReactNode } from 'react'

import {
  getRecoveryActionDescriptor,
  type RecoveryAction,
} from '@/modules/workspace/errors/recovery-model'
import { reportError } from '@/monitoring'
import { resolveRecoveryActionFromError } from '@/utils/errorHandler'

import { classifyError, getFriendlyErrorMessage } from './types'

interface PageErrorBoundaryProps {
  children: ReactNode
  fallbackComponent?: (props: { error: Error; reset: () => void }) => ReactNode
}

interface PageErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * 页面级错误边界
 * 捕获单个页面的错误，不影响整个应用
 */
export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): Partial<PageErrorBoundaryState> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorType = classifyError(error)

    console.error('[PageErrorBoundary] 页面错误:', error, errorInfo)

    reportError(error, {
      componentStack: errorInfo.componentStack ?? undefined,
      extra: {
        phase: 'render',
        errorType,
        location: window.location.href,
      },
      tags: {
        boundary: 'page',
        errorType,
      },
    })
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = (): void => {
    window.location.href = '/'
  }

  handleGoBack = (): void => {
    window.history.back()
  }

  handleRecoveryAction = (action: RecoveryAction): void => {
    if (action === 'relogin') {
      window.location.href = '/auth'
      return
    }

    if (action === 'contact_support') {
      window.location.href = 'mailto:dev@workspace.example.com'
      return
    }

    this.resetError()
  }

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // 使用自定义降级组件
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent({
          error: this.state.error,
          reset: this.resetError,
        })
      }

      // 默认降级UI
      const friendlyMessage = getFriendlyErrorMessage(this.state.error)
      const recoveryAction = resolveRecoveryActionFromError(this.state.error)
      const recoveryDescriptor = getRecoveryActionDescriptor(recoveryAction)
      const isDev = import.meta.env.DEV

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-6 space-y-4">
            <div className="text-center">
              <div className="text-5xl mb-3">😕</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">页面加载失败</h2>
              <p className="text-gray-600">{friendlyMessage}</p>
              <p className="text-sm text-gray-500 mt-2">{recoveryDescriptor.hint}</p>
            </div>

            {isDev && this.state.error && (
              <details className="bg-red-50 border border-red-200 rounded-lg p-3">
                <summary className="text-sm font-medium text-red-800 cursor-pointer">
                  查看错误详情
                </summary>
                <pre className="mt-2 text-xs text-red-700 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => this.handleRecoveryAction(recoveryAction)}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                {recoveryDescriptor.label}
              </button>
              <button
                type="button"
                onClick={this.handleGoBack}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                返回
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                首页
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
