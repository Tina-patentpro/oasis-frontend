import { ReactNode, Suspense } from 'react'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LoadingSpinner } from '@/components/ui'
import { GlobalToast } from '@/components/ui/GlobalToast'
import { MotionProvider } from '@/components/ui/motion'

import { AuthProvider } from './AuthProvider'
import { BackgroundTaskPoller } from './BackgroundTaskPoller'
import { LayoutProvider } from './LayoutProvider'
import { NotificationProvider } from './NotificationProvider'
import { ThemeProvider } from './ThemeProvider'

interface Props {
  children: ReactNode
}

export const AppProviders = ({ children }: Props) => {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
            <LoadingSpinner size="lg" className="text-emerald-600" />
            <p className="text-sm text-gray-500">加载中，请稍候…</p>
          </div>
        }
      >
        <MotionProvider>
          <ThemeProvider>
            <NotificationProvider>
              <AuthProvider>
                <LayoutProvider>
                  {/* 应用级兜底轮询。主异步状态以工作区轮询与任务中心为准。 */}
                  <BackgroundTaskPoller />
                  <GlobalToast />
                  {children}
                </LayoutProvider>
              </AuthProvider>
            </NotificationProvider>
          </ThemeProvider>
        </MotionProvider>
      </Suspense>
    </ErrorBoundary>
  )
}
