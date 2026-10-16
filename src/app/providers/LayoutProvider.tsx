import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'

import { GlobalLayout, type BreadcrumbItem } from '@/components/layout/GlobalLayout'

type LayoutState = {
  headerVisible: boolean
  breadcrumbs: BreadcrumbItem[]
  customHeader: React.ReactNode | null
  contentClassName?: string
}

type LayoutContextValue = LayoutState & {
  setHeaderVisibility: (visible: boolean) => void
  setBreadcrumbs: (items: BreadcrumbItem[]) => void
  resetBreadcrumbs: () => void
  setCustomHeader: (node: React.ReactNode | null) => void
  setContentClassName: (value?: string) => void
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined)

const createDefaultBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: BreadcrumbItem[] = [{ label: '首页', href: '/' }]
  let currentPath = ''

  segments.forEach((segment, index) => {
    currentPath = currentPath + '/' + segment
    const decoded = decodeURIComponent(segment).replace(/-/g, ' ')
    const isLast = index === segments.length - 1
    crumbs.push({ label: decoded, href: isLast ? undefined : currentPath })
  })

  return crumbs
}

interface LayoutProviderProps {
  children: ReactNode
}

const resolveDefaultContentClass = (pathname: string) =>
  pathname.startsWith('/workspace') ? 'p-0' : 'px-6 py-6'

export const LayoutProvider = ({ children }: LayoutProviderProps) => {
  const location = useLocation()
  const defaultBreadcrumbs = useMemo(
    () => createDefaultBreadcrumbs(location.pathname),
    [location.pathname],
  )

  const [state, setState] = useState<LayoutState>(() => ({
    headerVisible: false,
    breadcrumbs: defaultBreadcrumbs,
    customHeader: null,
    contentClassName: resolveDefaultContentClass(location.pathname),
  }))

  // Reset layout state when pathname changes - single setState call
  useEffect(() => {
    let canceled = false
    queueMicrotask(() => {
      if (canceled) return
      setState((prev) => ({
        ...prev,
        breadcrumbs: defaultBreadcrumbs,
        customHeader: null,
        contentClassName: resolveDefaultContentClass(location.pathname),
        headerVisible: false,
      }))
    })
    return () => {
      canceled = true
    }
  }, [defaultBreadcrumbs, location.pathname])

  const setHeaderVisibility = useCallback((visible: boolean) => {
    setState((prev) => ({ ...prev, headerVisible: visible }))
  }, [])

  const setBreadcrumbs = useCallback((items: BreadcrumbItem[]) => {
    setState((prev) => ({ ...prev, breadcrumbs: items }))
  }, [])

  const resetBreadcrumbs = useCallback(() => {
    setState((prev) => ({ ...prev, breadcrumbs: defaultBreadcrumbs }))
  }, [defaultBreadcrumbs])

  const setCustomHeader = useCallback((node: React.ReactNode | null) => {
    setState((prev) => ({ ...prev, customHeader: node }))
  }, [])

  const setContentClassName = useCallback((className?: string) => {
    setState((prev) => ({ ...prev, contentClassName: className }))
  }, [])

  const value = useMemo<LayoutContextValue>(
    () => ({
      ...state,
      setHeaderVisibility,
      setBreadcrumbs,
      resetBreadcrumbs,
      setCustomHeader,
      setContentClassName,
    }),
    [
      state,
      setHeaderVisibility,
      setBreadcrumbs,
      resetBreadcrumbs,
      setCustomHeader,
      setContentClassName,
    ],
  )

  return (
    <LayoutContext.Provider value={value}>
      <GlobalLayout
        headerVisible={state.headerVisible}
        customHeader={state.customHeader}
        contentClassName={state.contentClassName}
      >
        {children}
      </GlobalLayout>
    </LayoutContext.Provider>
  )
}

export const useLayout = () => {
  const context = useContext(LayoutContext)

  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider')
  }

  return context
}
