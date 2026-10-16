import type { ElementType, FC, ReactNode } from 'react'

const VARIANT_CLASS: Record<'default' | 'strong' | 'muted', string> = {
  default: 'border border-marketing-border bg-marketing-surface shadow-marketing-sm',
  strong: 'border border-marketing-border-strong bg-marketing-surface-strong shadow-marketing-lg',
  muted: 'border border-marketing-border bg-marketing-surface-muted shadow-marketing-sm',
}

const GLOW_CLASS: Record<'blue' | 'emerald' | 'purple', string> = {
  blue: 'bg-[radial-gradient(circle_at_top,_var(--marketing-glow-blue),_transparent_60%)]',
  emerald: 'bg-[radial-gradient(circle_at_top,_var(--marketing-glow-emerald),_transparent_60%)]',
  purple: 'bg-[radial-gradient(circle_at_top,_var(--marketing-glow-purple),_transparent_60%)]',
}

export interface MarketingCardProps {
  as?: ElementType
  variant?: 'default' | 'strong' | 'muted'
  glow?: 'blue' | 'emerald' | 'purple'
  className?: string
  padding?: 'lg' | 'md' | 'sm'
  children: ReactNode
  [key: string]: unknown
}

export const MarketingCard: FC<MarketingCardProps> = ({
  as: Component = 'div',
  variant = 'default',
  glow,
  className = '',
  padding = 'lg',
  children,
  ...rest
}) => {
  const paddingClass = padding === 'lg' ? 'p-8' : padding === 'md' ? 'p-6' : 'p-4'
  const variantClass = VARIANT_CLASS[variant]
  const glowClass = glow ? GLOW_CLASS[glow] : ''

  const composedClass = [
    'relative overflow-hidden rounded-3xl backdrop-blur-xl',
    variantClass,
    paddingClass,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Component className={composedClass} {...rest}>
      {glow && (
        <div
          className={`pointer-events-none absolute inset-0 ${glowClass} opacity-70`}
          aria-hidden="true"
        />
      )}
      <div className="relative">{children}</div>
    </Component>
  )
}

MarketingCard.displayName = 'MarketingCard'
