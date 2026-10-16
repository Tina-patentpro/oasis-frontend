import React from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface GlobalLayoutProps {
  headerVisible: boolean
  customHeader: React.ReactNode | null
  contentClassName?: string
  children: React.ReactNode
}

export const GlobalLayout: React.FC<GlobalLayoutProps> = ({
  headerVisible,
  customHeader,
  contentClassName,
  children,
}) => {
  const mainClass = contentClassName || ''

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {headerVisible && customHeader && (
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-6 py-4">{customHeader}</div>
        </header>
      )}
      <div className="flex-1">
        <div className={mainClass}>{children}</div>
      </div>
    </div>
  )
}

GlobalLayout.displayName = 'GlobalLayout'
