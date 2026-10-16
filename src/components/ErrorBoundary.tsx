import { Component, type ErrorInfo, type ReactNode } from 'react'

import { reportError } from '@/monitoring'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('应用错误:', error, errorInfo)
    reportError(error, {
      componentStack: errorInfo.componentStack ?? undefined,
      extra: { phase: 'render' },
      tags: { boundary: 'app' },
    })
    this.setState({ error, errorInfo })
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">应用遇到错误</h1>
              <p className="text-gray-600 mb-4">抱歉,应用运行时出现了问题。</p>
            </div>
            {this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-mono">{this.state.error.toString()}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              重新加载应用
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
