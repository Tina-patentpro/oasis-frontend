import { describe, expect, test } from '@jest/globals'

import {
  clampChatPanelWidth,
  getChatPanelAvailableWidth,
  getChatPanelMaxWidth,
  getChatPanelWidthBounds,
} from './chatPanelWidth'

describe('chatPanelWidth', () => {
  test('keeps full mode width aligned with the available workspace width', () => {
    const params = {
      totalWidth: 1200,
      chatMode: 'full' as const,
      showSidebar: true,
      leftSidebarWidth: 320,
    }

    expect(getChatPanelAvailableWidth(params)).toBe(848)
    expect(getChatPanelMaxWidth(params)).toBe(848)
    expect(clampChatPanelWidth(1168, params)).toBe(848)
  })

  test('uses the full viewport width when full mode hides the left sidebar', () => {
    const params = {
      totalWidth: 1200,
      chatMode: 'full' as const,
      showSidebar: false,
      leftSidebarWidth: 320,
    }

    expect(getChatPanelAvailableWidth(params)).toBe(1168)
    expect(getChatPanelMaxWidth(params)).toBe(1168)
    expect(clampChatPanelWidth(1168, params)).toBe(1168)
  })

  test('keeps quarter mode capped to half of the remaining workspace width', () => {
    const params = {
      totalWidth: 1200,
      chatMode: 'quarter' as const,
      showSidebar: true,
      leftSidebarWidth: 320,
    }

    expect(getChatPanelAvailableWidth(params)).toBe(816)
    expect(getChatPanelMaxWidth(params)).toBe(408)
    expect(clampChatPanelWidth(600, params)).toBe(408)
  })

  test('allows full mode to shrink below the desktop minimum on a 320px viewport', () => {
    const params = {
      totalWidth: 320,
      chatMode: 'full' as const,
      showSidebar: false,
      leftSidebarWidth: 320,
    }

    expect(getChatPanelWidthBounds(params)).toEqual({
      availableWidth: 288,
      minWidth: 288,
      maxWidth: 288,
      canResize: false,
    })
    expect(clampChatPanelWidth(453, params)).toBe(288)
  })

  test('uses the compact quarter width without exposing a fake resize range', () => {
    const params = {
      totalWidth: 320,
      chatMode: 'quarter' as const,
      showSidebar: false,
      leftSidebarWidth: 320,
    }

    expect(getChatPanelWidthBounds(params)).toEqual({
      availableWidth: 256,
      minWidth: 256,
      maxWidth: 256,
      canResize: false,
    })
    expect(clampChatPanelWidth(453, params)).toBe(256)
  })
})
