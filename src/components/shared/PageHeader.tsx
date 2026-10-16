import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'

type BreadcrumbItem = {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  className = '',
}) => {
  const headerClassName = useMemo(() => {
    return ['space-y-4', className].filter(Boolean).join(' ').trim()
  }, [className])

  return (
    <header className={headerClassName}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="面包屑导航"
          className="text-sm text-gray-500 flex flex-wrap items-center gap-2"
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1
            const key = [crumb.label, index].join('-')
            const content =
              crumb.href && !isLast ? (
                <Link to={crumb.href} className="hover:text-gray-700 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-gray-700 font-medium' : undefined}>
                  {crumb.label}
                </span>
              )

            return (
              <React.Fragment key={key}>
                {index > 0 && <span aria-hidden="true">/</span>}
                {content}
              </React.Fragment>
            )
          })}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          {description && <p className="mt-1 text-gray-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  )
}

PageHeader.displayName = 'PageHeader'
