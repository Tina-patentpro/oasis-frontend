import { memo } from 'react'

import type { Theme } from '../../types'

interface TypingIndicatorProps {
  theme: Theme
}

export const TypingIndicator = memo<TypingIndicatorProps>(
  ({ theme }) => {
    return (
      <div className="flex justify-start" role="status" aria-label="助手正在输入" aria-live="polite">
        <div
          className="typing-bubble max-w-[85%] px-4 py-3 text-sm leading-relaxed rounded-2xl shadow-sm border"
          style={{
            backgroundColor: `${theme.background}`,
            borderColor: `${theme.primary}26`,
            boxShadow: `0 8px 18px ${theme.primary}14`,
            color: theme.primaryText ?? theme.primary,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      </div>
    )
  },
  (prev, next) =>
    prev.theme.primary === next.theme.primary &&
    prev.theme.primaryText === next.theme.primaryText &&
    prev.theme.background === next.theme.background,
)

TypingIndicator.displayName = 'TypingIndicator'
