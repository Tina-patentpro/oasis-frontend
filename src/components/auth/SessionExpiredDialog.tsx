import { useEffect, useId } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'
import { useAuthStore } from '@/stores/useAuthStore'

export const SessionExpiredDialog = () => {
  const reauthRequired = useAuthStore((state) => state.reauthRequired)
  const message = useAuthStore((state) => state.reauthMessage)
  const clearReauth = useAuthStore((state) => state.clearReauth)
  const location = useLocation()
  const navigate = useNavigate()
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (reauthRequired && location.pathname.startsWith('/auth')) {
      clearReauth()
    }
  }, [clearReauth, location.pathname, reauthRequired])

  if (!reauthRequired || location.pathname.startsWith('/auth')) {
    return null
  }

  const handleRelogin = () => {
    clearReauth()
    navigate('/auth', { replace: true, state: { from: location } })
  }

  const handleDismiss = () => {
    clearReauth()
  }

  return (
    <AccessibleDialog
      isOpen
      onClose={handleDismiss}
      labelledBy={titleId}
      describedBy={descriptionId}
      closeOnOverlayClick={false}
      zIndexClassName="z-[120]"
      wrapperClassName="items-center justify-center px-4 overflow-auto"
      overlayClassName="bg-black/50 backdrop-blur-sm"
      className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200"
    >
      <div className="px-6 pb-1 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div>
            <h3 id={titleId} className="text-lg font-semibold text-gray-900">
              登录状态已失效
            </h3>
            <p id={descriptionId} className="mt-1 text-sm text-gray-600">
              {message ?? '当前会话已过期，请重新登录以继续使用工作台。'}
            </p>
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 pt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          稍后再说
        </button>
        <button
          type="button"
          onClick={handleRelogin}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          重新登录
        </button>
      </div>
    </AccessibleDialog>
  )
}
