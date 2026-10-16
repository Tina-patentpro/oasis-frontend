import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'

import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { ResetPasswordDialog } from '@/components/auth/ResetPasswordDialog'
import { LoadingSpinner } from '@/components/ui'
import { selectIsAuthenticated, useAuthStore } from '@/stores/useAuthStore'
import { PageErrorBoundary } from '@/components/error-boundaries'
import { preloadProfile, preloadWorkspace } from '@/app/loaders'

type AuthMode = 'login' | 'register'

const DEFAULT_WORKSPACE_TITLE = '绿洲慧写智能工作台 | AI 专利撰写项目管理系统'

const AUTH_PAGE_TITLES: Record<AuthMode, string> = {
  login: '绿洲慧写智能工作台登录 | AI 专利撰写项目管理系统',
  register: '注册绿洲慧写智能工作台账号 | AI 专利撰写项目管理系统',
}

function resolvePostAuthDestination(from?: Location): string {
  const pathname = from?.pathname
  if (!pathname || !pathname.startsWith('/') || pathname.startsWith('//')) {
    return '/workspace'
  }

  const search = from.search?.startsWith('?') ? from.search : ''
  const hash = from.hash?.startsWith('#') ? from.hash : ''
  return `${pathname}${search}${hash}`
}

const AuthPageContent = () => {
  const [mode, setMode] = useState<AuthMode>('login')
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating)
  const error = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)
  const location = useLocation()

  const redirectPath = useMemo(() => {
    const state = location.state as { from?: Location } | undefined
    return resolvePostAuthDestination(state?.from)
  }, [location.state])

  useEffect(() => {
    document.title = AUTH_PAGE_TITLES[mode]

    return () => {
      document.title = DEFAULT_WORKSPACE_TITLE
    }
  }, [mode])

  // Preload the chunk for the user's actual destination.
  // Skipped when already authenticated (redirect case) or in register mode
  // (register users have plenty of time while filling the form).
  useEffect(() => {
    if (!isAuthenticated && mode === 'login') {
      if (redirectPath.startsWith('/user/profile-reward')) {
        preloadProfile()
      } else {
        preloadWorkspace()
      }
    }
  }, [isAuthenticated, mode, redirectPath])

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />
  }

  return (
    <div className="min-h-screen min-w-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 flex items-center justify-center px-4 py-12">
      <div className="grid w-full min-w-0 max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-w-0 space-y-8">
          <div>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
              绿洲慧写 · 智能工作台
            </span>
            <h1 className="mt-6 text-4xl font-bold text-gray-900">
              {mode === 'login' ? '欢迎回来' : '创建新账户'}
            </h1>
            <p className="mt-3 text-base text-gray-600 leading-relaxed">
              {mode === 'login'
                ? '登录以继续管理项目、生成新内容或完善原有的工作。'
                : '注册后即可畅享工作流与对话流能力，随时追踪项目数据与余额使用情况。'}
            </p>
          </div>

          <ul className="space-y-3 rounded-2xl border border-emerald-100 bg-white/80 p-6 backdrop-blur">
            <li className="flex items-center gap-3 text-sm text-gray-700">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                ✓
              </span>
              为专利撰写提供全过程咨询和辅助
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-700">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                ✓
              </span>
              项目、会话、历史资料全链路联动
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-700">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                ✓
              </span>
              无需购买会员，可以随用随付
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-700">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                ✓
              </span>
              实时余额与交易流水，消费清晰可追溯
            </li>
          </ul>
        </div>

        <div className="relative min-w-0">
          <div className="absolute -inset-2 rounded-[32px] bg-gradient-to-br from-emerald-100 via-white to-emerald-50 blur-3xl sm:-inset-4 lg:-inset-6" />
          <div className="relative min-w-0 rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {mode === 'login' ? (
              <LoginForm
                onRegisterClick={() => {
                  clearError()
                  setIsResetPasswordDialogOpen(false)
                  setMode('register')
                }}
                onForgotPasswordClick={() => setIsResetPasswordDialogOpen(true)}
              />
            ) : (
              <RegisterForm
                onLoginClick={() => {
                  clearError()
                  setMode('login')
                }}
              />
            )}

            {isAuthenticating && (
              <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-700">
                <LoadingSpinner size="sm" className="text-emerald-600" />
                正在提交请求，请稍候…
              </div>
            )}
          </div>
        </div>
      </div>

      <ResetPasswordDialog
        isOpen={isResetPasswordDialogOpen}
        onClose={() => setIsResetPasswordDialogOpen(false)}
      />
    </div>
  )
}

export const AuthPage = () => {
  return (
    <PageErrorBoundary>
      <AuthPageContent />
    </PageErrorBoundary>
  )
}
