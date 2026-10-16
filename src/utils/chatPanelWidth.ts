export type ChatPanelWidthMode = 'off' | 'quarter' | 'full'

export const MIN_CHAT_PANEL_WIDTH = 360
export const DEFAULT_LEFT_SIDEBAR_WIDTH = 320

const FULL_LAYOUT_GUTTER = 32
const QUARTER_LAYOUT_GUTTER = 64
const CHAT_PANEL_EDGE_GAP = 80

export interface ChatPanelWidthParams {
  totalWidth: number
  chatMode: ChatPanelWidthMode
  showSidebar: boolean
  leftSidebarWidth: number
}

export function getChatPanelAvailableWidth({
  totalWidth,
  chatMode,
  showSidebar,
  leftSidebarWidth,
}: ChatPanelWidthParams): number {
  const reservedForSidebar = showSidebar ? leftSidebarWidth : 0
  const layoutGutter = chatMode === 'full' ? FULL_LAYOUT_GUTTER : QUARTER_LAYOUT_GUTTER
  return Math.max(totalWidth - reservedForSidebar - layoutGutter, 0)
}

export function getQuarterChatPanelMaxWidth(availableWidth: number): number {
  if (availableWidth <= MIN_CHAT_PANEL_WIDTH) {
    return Math.max(availableWidth, 0)
  }
  const rawMax = Math.max(availableWidth - CHAT_PANEL_EDGE_GAP, MIN_CHAT_PANEL_WIDTH)
  return Math.max(Math.min(Math.round(availableWidth / 2), rawMax), MIN_CHAT_PANEL_WIDTH)
}

export function getChatPanelMaxWidth(params: ChatPanelWidthParams): number {
  const available = getChatPanelAvailableWidth(params)
  if (params.chatMode === 'quarter') {
    return getQuarterChatPanelMaxWidth(available)
  }
  return available
}

export function clampChatPanelWidth(width: number, params: ChatPanelWidthParams): number {
  const { minWidth, maxWidth } = getChatPanelWidthBounds(params)
  return Math.min(Math.max(width, minWidth), maxWidth)
}

export function getChatPanelWidthBounds(params: ChatPanelWidthParams): {
  availableWidth: number
  minWidth: number
  maxWidth: number
  canResize: boolean
} {
  const availableWidth = getChatPanelAvailableWidth(params)
  const maxWidth = getChatPanelMaxWidth(params)
  const minWidth = Math.min(MIN_CHAT_PANEL_WIDTH, maxWidth)
  return {
    availableWidth,
    minWidth,
    maxWidth,
    canResize: params.chatMode === 'quarter' && maxWidth > minWidth,
  }
}
