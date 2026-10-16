import { useEffect, type ReactNode } from 'react'

import { SessionExpiredDialog } from '@/components/auth/SessionExpiredDialog'
import { SessionExpiryBanner } from '@/components/auth/SessionExpiryBanner'
import { useAuthStore } from '@/stores/useAuthStore'

interface Props {
  children: ReactNode
}

export const AuthProvider = ({ children }: Props) => {
  const initialize = useAuthStore((state) => state.initialize)
  const initialized = useAuthStore((state) => state.initialized)

  useEffect(() => {
    if (!initialized) {
      void initialize()
    }
  }, [initialized, initialize])

  return (
    <>
      {children}
      <SessionExpiryBanner />
      <SessionExpiredDialog />
    </>
  )
}
