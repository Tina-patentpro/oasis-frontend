import React from 'react'

interface PlaceholderCardProps {
  title: string
  description?: string
  icon?: React.ReactNode
  className?: string
}

export const PlaceholderCard: React.FC<PlaceholderCardProps> = ({
  title,
  description,
  icon,
  className = '',
}) => {
  const containerClasses = [
    'bg-white',
    'rounded-lg',
    'shadow',
    'p-8',
    'border',
    'border-gray-200',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses}>
      <div className="text-center text-gray-500 space-y-3">
        {icon && <div className="flex justify-center text-4xl">{icon}</div>}
        <p className="text-lg font-medium text-gray-700">{title}</p>
        {description && <p className="text-sm">{description}</p>}
      </div>
    </div>
  )
}

PlaceholderCard.displayName = 'PlaceholderCard'
