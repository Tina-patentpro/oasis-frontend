import { type ReactNode } from 'react'

import { ComponentErrorBoundary } from '@/components/error-boundaries/ComponentErrorBoundary'

interface LazyDialogBoundaryProps {
  children: ReactNode
  dialogName: string
  chunkName: string
  onReload?: () => void
}

export function LazyDialogBoundary({
  children,
  dialogName,
  chunkName,
  onReload = () => window.location.reload(),
}: LazyDialogBoundaryProps) {
  return (
    <ComponentErrorBoundary
      componentName={dialogName}
      chunkName={chunkName}
      maxRetries={1}
      fallbackComponent={({ error }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div
            role="alert"
            className="max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-xl"
          >
            <div className="mb-3 text-3xl">⚠️</div>
            <h2 className="text-base font-semibold text-gray-900">{dialogName}暂时无法打开</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              可能是页面版本已更新，当前浏览器仍在使用旧资源。请刷新页面后重试。
            </p>
            <p className="mt-2 text-xs text-gray-500">{error.message}</p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              onClick={onReload}
            >
              刷新页面
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ComponentErrorBoundary>
  )
}
