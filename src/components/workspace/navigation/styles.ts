import type { CSSProperties } from 'react'

import type { ChatMode } from '@/modules/workspace/stores'
import type { Theme } from '@/types'

export function isDarkTheme(themeKey: string) {
  return themeKey.startsWith('dark')
}

export function getHeaderButtonStyle(themeIsDark: boolean, currentTheme: Theme): CSSProperties {
  return (
    themeIsDark
      ? {
          '--chat-btn-bg': 'rgba(255, 255, 255, 0.16)',
          '--chat-btn-color': '#f9fafb',
          '--chat-btn-border': '1px solid rgba(255, 255, 255, 0.24)',
          '--chat-btn-hover-bg': 'rgba(255, 255, 255, 0.26)',
          '--chat-btn-hover-color': '#ffffff',
          '--chat-btn-hover-shadow': 'rgba(15, 23, 42, 0.35)',
          '--chat-btn-press-bg': 'rgba(255, 255, 255, 0.32)',
          '--chat-btn-focus-ring': '#f9fafb',
          '--chat-btn-hover-translate': '-1px',
        }
      : {
          '--chat-btn-bg': '#ffffff',
          '--chat-btn-color': '#1f2937',
          '--chat-btn-border': `1px solid ${currentTheme.primary}26`,
          '--chat-btn-hover-bg': `${currentTheme.primary}14`,
          '--chat-btn-hover-color': currentTheme.primary,
          '--chat-btn-hover-shadow': `${currentTheme.primary}29`,
          '--chat-btn-press-bg': `${currentTheme.primary}26`,
          '--chat-btn-focus-ring': currentTheme.primary,
          '--chat-btn-hover-translate': '-1px',
        }
  ) as CSSProperties
}

export function getChatModeHint(chatMode: ChatMode): string {
  return chatMode === 'off'
    ? '隐藏对话栏'
    : chatMode === 'quarter'
      ? '占用可用宽度的 1/4'
      : '占用全部可用宽度'
}

export function getActiveSegmentLeft(chatMode: ChatMode): string {
  return chatMode === 'off' ? '0%' : chatMode === 'quarter' ? '33.333333%' : '66.666667%'
}

export function getCompactChatMode(chatMode: ChatMode): 'off' | 'full' {
  return chatMode === 'off' ? 'off' : 'full'
}

export function getCompactActiveSegmentTransform(chatMode: ChatMode): string {
  return getCompactChatMode(chatMode) === 'off' ? 'translateX(0%)' : 'translateX(100%)'
}
