import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { getAccessTokenRemainingMs } from '@/api/core/token-storage'
import { useAuthStore } from '@/stores/useAuthStore'

const WARNING_WINDOW_MS = 5 * 60 * 1000
const CHECK_INTERVAL_MS = 30 * 1000

export const SessionExpiryBanner = () => {
  const accessToken = useAuthStore((state) => state.accessToken)
  const location = useLocation()
  const navigate = useNavigate()
  const [dismissedToken, setDismissedToken] = useState<string | null>(null)
  const [, setTick] = useState(0)

  const isAuthRoute = location.pathname.startsWith('/auth')
  const remainingMs = accessToken ? getAccessTokenRemainingMs() : null

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick((value) => value + 1)
    }, CHECK_INTERVAL_MS)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTick((value) => value + 1)
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const shouldShow = useMemo(() => {
    if (!accessToken || isAuthRoute || dismissedToken === accessToken) {
      return false
    }
    if (!remainingMs || remainingMs > WARNING_WINDOW_MS) {
      return false
    }
    return true
  }, [accessToken, dismissedToken, isAuthRoute, remainingMs])

  if (!shouldShow) {
    return null
  }

  const remainingMinutes = Math.max(1, Math.ceil((remainingMs ?? 0) / 60_000))

  const handleRelogin = () => {
    navigate('/auth', { replace: true, state: { from: location } })
  }

  const handleDismiss = () => {
    if (accessToken) {
      setDismissedToken(accessToken)
    }
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[130] border-b border-amber-200 bg-amber-50/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-12 max-w-screen-2xl items-center justify-between gap-3 px-4 py-2">
        <p className="text-sm text-amber-900">
          <span className="font-semibold">登录状态即将过期：</span>
          预计 {remainingMinutes} 分钟后失效，请及时重新登录。
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
          >
            稍后提醒
          </button>
          <button
            type="button"
            onClick={handleRelogin}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            重新登录
          </button>
        </div>
      </div>
    </div>
  )
}
