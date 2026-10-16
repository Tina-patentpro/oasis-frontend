import { motion } from '@/components/ui/motion'
import type { FC } from 'react'

import type { ChatMode } from '@/modules/workspace/stores'
import { Tooltip } from '@/components/ui'
import type { Theme } from '@/types'

import { getCompactActiveSegmentTransform, getCompactChatMode } from './styles'

interface ChatModeSwitchProps {
  chatMode: ChatMode
  chatModeHint: string
  activeSegmentLeft: string
  currentTheme: Theme
  isDarkTheme: boolean
  onChangeChatMode: (mode: ChatMode) => void
}

const compactOptions = [
  { mode: 'off', label: 'Off' },
  { mode: 'full', label: 'Full' },
] as const

const desktopOptions = [
  { mode: 'off', label: 'Off' },
  { mode: 'quarter', label: 'On' },
  { mode: 'full', label: 'Full' },
] as const

export const ChatModeSwitch: FC<ChatModeSwitchProps> = ({
  chatMode,
  chatModeHint,
  activeSegmentLeft,
  currentTheme,
  isDarkTheme,
  onChangeChatMode,
}) => {
  const compactChatMode = getCompactChatMode(chatMode)
  const optionColor = (mode: ChatMode, activeMode: ChatMode) =>
    mode === activeMode ? '#ffffff' : isDarkTheme ? '#cbd5f5' : '#4b5563'
  const renderOptions = (
    options: ReadonlyArray<{ mode: ChatMode; label: string }>,
    activeMode: ChatMode,
  ) =>
    options.map(({ mode, label }) => (
      <button
        key={mode}
        type="button"
        className="relative flex-1 px-2 py-1.5 uppercase tracking-wide sm:px-4"
        onClick={() => onChangeChatMode(mode)}
        aria-pressed={activeMode === mode}
        aria-label={`设置对话栏为 ${label}`}
        style={{ color: optionColor(mode, activeMode) }}
      >
        <span className="relative z-10">{label}</span>
      </button>
    ))

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip
        content={
          <div className="space-y-1">
            <div>切换对话栏模式</div>
            <div className="text-xs opacity-80">当前: {chatModeHint}</div>
            <div className="text-xs opacity-80">点击对应选项切换对话栏显示模式</div>
          </div>
        }
      >
        <div className="relative">
          <div
            data-testid="compact-chat-mode-switch"
            className="relative flex overflow-hidden rounded-full border text-xs font-semibold sm:hidden"
            style={{
              borderColor: `${currentTheme.primary}33`,
              color: isDarkTheme ? '#f9fafb' : '#374151',
            }}
          >
            <div
              data-testid="compact-chat-mode-indicator"
              className="absolute inset-y-0 left-0 rounded-full transition-transform duration-200 motion-reduce:transition-none"
              style={{
                width: '50%',
                transform: getCompactActiveSegmentTransform(chatMode),
                background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primaryHover} 100%)`,
                boxShadow: `0 4px 12px ${currentTheme.primary}40`,
              }}
            />
            {renderOptions(compactOptions, compactChatMode)}
          </div>

          <div
            data-testid="desktop-chat-mode-switch"
            className="relative hidden overflow-hidden rounded-full border text-xs font-semibold sm:flex"
            style={{
              borderColor: `${currentTheme.primary}33`,
              color: isDarkTheme ? '#f9fafb' : '#374151',
            }}
          >
            <motion.div
              data-testid="desktop-chat-mode-indicator"
              className="absolute top-0 bottom-0 rounded-full transition-[left] duration-200 motion-reduce:transition-none"
              style={{ width: '33.333333%', left: activeSegmentLeft }}
              animate={{
                background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.primaryHover} 100%)`,
                boxShadow: `0 4px 12px ${currentTheme.primary}40`,
              }}
            />
            {renderOptions(desktopOptions, chatMode)}
          </div>
        </div>
      </Tooltip>
    </div>
  )
}
