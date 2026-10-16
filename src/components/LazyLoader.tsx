import { Suspense, ComponentType, lazy } from 'react'

interface LazyLoaderProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function LazyLoader({ children, fallback }: LazyLoaderProps) {
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
          </div>
        )
      }
    >
      {children}
    </Suspense>
  )
}

export const createLazyComponent = <P extends Record<string, unknown> = Record<string, never>>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
) => lazy(importFunc)
