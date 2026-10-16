import type { CSSProperties } from 'react'

import type { ChatTabKey, Theme } from '../../types'

import { MIN_TEXTAREA_HEIGHT, PLACEHOLDER_BY_TAB, TEXTAREA_AUTO_MAX_HEIGHT, TEXTAREA_HEIGHT_PRESETS, CHAT_INPUT_MAX_LENGTH, type TextareaHeightPresetKey } from './ChatPanel.constants'

function clampTextareaHeight(height: number): number {
  return Math.min(Math.max(height, MIN_TEXTAREA_HEIGHT), TEXTAREA_AUTO_MAX_HEIGHT)
}

export function getTextareaHeight(scrollHeight: number, preset: TextareaHeightPresetKey): number {
  const presetHeight = TEXTAREA_HEIGHT_PRESETS[preset].baseHeight
  return clampTextareaHeight(Math.max(scrollHeight, presetHeight, MIN_TEXTAREA_HEIGHT))
}

export function getChatInputPlaceholder(loading: boolean, chatTab: ChatTabKey): string {
  if (loading) {
    return 'AI 正在生成回复，请稍候…'
  }

  return PLACEHOLDER_BY_TAB[chatTab] ?? '向助手描述你的问题或需求…'
}

export function clampChatInput(value: string): string {
  return value.length > CHAT_INPUT_MAX_LENGTH ? value.slice(0, CHAT_INPUT_MAX_LENGTH) : value
}

export function getComposerAttachmentButtonStyle(theme: Theme): CSSProperties {
  const themeColor = theme.primary
  const themeTextColor = theme.primaryText ?? theme.primary

  return {
    '--chat-btn-bg': '#ffffff',
    '--chat-btn-color': '#4b5563',
    '--chat-btn-border': `1px solid ${themeColor}26`,
    '--chat-btn-hover-bg': `${themeColor}14`,
    '--chat-btn-hover-color': themeTextColor,
    '--chat-btn-hover-shadow': `${themeColor}24`,
    '--chat-btn-press-bg': `${themeColor}26`,
    '--chat-btn-focus-ring': themeColor,
    '--chat-btn-hover-translate': '-1px',
  } as CSSProperties
}

export function getAssociateProjectButtonStyle(theme: Theme): CSSProperties {
  const themeColor = theme.primary
  const themeTextColor = theme.primaryText ?? theme.primary

  return {
    '--chat-btn-bg': '#f3f4f6',
    '--chat-btn-color': '#374151',
    '--chat-btn-border': `1px solid ${themeColor}26`,
    '--chat-btn-hover-bg': `${themeColor}14`,
    '--chat-btn-hover-color': themeTextColor,
    '--chat-btn-hover-shadow': `${themeColor}29`,
    '--chat-btn-press-bg': `${themeColor}26`,
    '--chat-btn-focus-ring': themeColor,
    '--chat-btn-hover-translate': '-1px',
  } as CSSProperties
}
