import { memo } from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner = memo<LoadingSpinnerProps>(({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  }

  return (
    <div
      className={`${sizeClasses[size]} border-t-transparent rounded-full animate-spin ${className}`}
      style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
    ></div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'
