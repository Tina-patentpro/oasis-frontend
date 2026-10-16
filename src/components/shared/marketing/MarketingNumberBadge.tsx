import React from 'react'

interface MarketingNumberBadgeProps {
  value: string
  className?: string
}

export const MarketingNumberBadge: React.FC<MarketingNumberBadgeProps> = ({
  value,
  className = '',
}) => (
  <span
    className={`flex h-10 w-10 items-center justify-center rounded-full bg-marketing-primary-soft text-marketing-primary font-semibold ${className}`.trim()}
  >
    {value}
  </span>
)

MarketingNumberBadge.displayName = 'MarketingNumberBadge'
