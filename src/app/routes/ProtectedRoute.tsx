import type { ReactElement, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { LoadingSpinner } from '@/components/ui'
import { selectIsAuthenticated, useAuthStore } from '@/stores/useAuthStore'

interface ProtectedRouteProps {
  children: ReactNode
  redirectTo?: string
}

export const ProtectedRoute = ({
  children,
  redirectTo = '/auth/login',
}: ProtectedRouteProps): ReactElement => {
  const location = useLocation()
  const initialized = useAuthStore((state) => state.initialized)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  if (!initialized) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-white">
        <LoadingSpinner size="lg" className="text-emerald-600" />
        <p className="text-sm text-gray-500">正在验证登录状态…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return <>{children}</>
}
