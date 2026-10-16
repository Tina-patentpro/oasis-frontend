import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { LoadingFallback } from '@/components/ui'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { workspaceLoader, profileLoader } from './loaders'

const WorkspaceApp = lazy(workspaceLoader)
const AuthPage = lazy(() =>
  import('@/pages/auth/AuthPage').then((module) => ({ default: module.AuthPage })),
)
const ProfileAndRewardPage = lazy(profileLoader)

export const App = () => {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-emerald-700 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        跳到主内容
      </a>
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Navigate to="/workspace" replace />} />
          <Route
            path="/auth/*"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <AuthPage />
              </Suspense>
            }
          />
          <Route
            path="/workspace/*"
            element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingFallback />}>
                  <WorkspaceApp />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/profile-reward"
            element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingFallback />}>
                  <ProfileAndRewardPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/workspace" replace />} />
        </Routes>
      </main>
    </>
  )
}
