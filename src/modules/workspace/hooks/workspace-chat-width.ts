import {
  MIN_CHAT_PANEL_WIDTH,
  getQuarterChatPanelMaxWidth,
} from '@/utils/chatPanelWidth'

export { MIN_CHAT_PANEL_WIDTH }

export function getQuarterChatMaxWidth(availableWidth: number): number {
  return getQuarterChatPanelMaxWidth(availableWidth)
}

export function getRestoredQuarterChatWidth(
  preferredWidth: number,
  availableWidth: number,
): number {
  const maxAllowed = getQuarterChatMaxWidth(availableWidth)
  return Math.min(Math.max(preferredWidth, MIN_CHAT_PANEL_WIDTH), maxAllowed)
}

export function shouldUpdatePreferredQuarterChatWidth(params: {
  chatMode: 'off' | 'quarter' | 'full'
  previousChatMode: 'off' | 'quarter' | 'full'
  chatWidth: number
  pendingAutoAdjustedWidth: number | null
  tolerance?: number
}): boolean {
  const { chatMode, previousChatMode, chatWidth, pendingAutoAdjustedWidth, tolerance = 2 } = params

  if (chatMode !== 'quarter' || previousChatMode !== 'quarter') {
    return false
  }

  if (pendingAutoAdjustedWidth === null) {
    return true
  }

  return Math.abs(pendingAutoAdjustedWidth - chatWidth) > tolerance
}
