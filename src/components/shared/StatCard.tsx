import React, { useMemo } from 'react'

export type StatTrend = 'up' | 'down' | 'neutral'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  trend?: StatTrend
  icon?: React.ReactNode
  className?: string
  footer?: React.ReactNode
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  className = '',
  footer,
}) => {
  const { trendLabel, trendClassName, iconWrapperClass } = useMemo(() => {
    const config = {
      up: {
        label: '↑',
        textClass: 'text-green-600',
        iconClass: 'bg-green-100 text-green-600',
      },
      down: {
        label: '↓',
        textClass: 'text-red-600',
        iconClass: 'bg-red-100 text-red-600',
      },
      neutral: {
        label: '–',
        textClass: 'text-gray-500',
        iconClass: 'bg-gray-100 text-gray-500',
      },
    } as const

    const next = config[trend]
    return {
      trendLabel: next.label,
      trendClassName: next.textClass,
      iconWrapperClass: next.iconClass,
    }
  }, [trend])

  const cardClassName = useMemo(() => {
    return ['bg-white', 'rounded-lg', 'shadow', 'p-6', 'border', 'border-gray-200', className]
      .filter(Boolean)
      .join(' ')
      .trim()
  }, [className])

  const changeClassName = useMemo(() => {
    return ['text-sm', 'mt-2', trendClassName].filter(Boolean).join(' ')
  }, [trendClassName])

  const iconClassName = useMemo(() => {
    return ['p-4', 'rounded-full', iconWrapperClass].filter(Boolean).join(' ')
  }, [iconWrapperClass])

  return (
    <div className={cardClassName}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {change && (
            <p className={changeClassName}>
              {trendLabel} {change}
            </p>
          )}
        </div>
        {icon && <div className={iconClassName}>{icon}</div>}
      </div>
      {footer && <div className="mt-4 text-sm text-gray-500">{footer}</div>}
    </div>
  )
}

StatCard.displayName = 'StatCard'
