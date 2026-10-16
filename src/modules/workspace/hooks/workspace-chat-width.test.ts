import { describe, expect, test } from '@jest/globals'

import {
  MIN_CHAT_PANEL_WIDTH,
  getQuarterChatMaxWidth,
  getRestoredQuarterChatWidth,
  shouldUpdatePreferredQuarterChatWidth,
} from './workspace-chat-width'

describe('workspace chat width helpers', () => {
  test('restores the preferred quarter width after the viewport widens again', () => {
    const narrowedAvailableWidth = 820
    const widenedAvailableWidth = 1200
    const preferredWidth = 453

    const narrowedWidth = getRestoredQuarterChatWidth(preferredWidth, narrowedAvailableWidth)
    const widenedWidth = getRestoredQuarterChatWidth(preferredWidth, widenedAvailableWidth)

    expect(narrowedWidth).toBe(getQuarterChatMaxWidth(narrowedAvailableWidth))
    expect(widenedWidth).toBe(preferredWidth)
  })

  test('uses the real available width when the viewport is below the desktop minimum', () => {
    expect(getQuarterChatMaxWidth(300)).toBe(300)
    expect(getRestoredQuarterChatWidth(240, 300)).toBe(300)
  })

  /* ---- Boundary 3: user drag vs. passive viewport narrowing ---- */

  test('user preference (453px) is preserved when viewport is wide enough', () => {
    const preferred = 453
    const wideViewport = 1400
    expect(getRestoredQuarterChatWidth(preferred, wideViewport)).toBe(453)
  })

  test('user preference is clamped to quarter max when viewport narrows passively', () => {
    const preferred = 453
    const narrowViewport = 820
    const maxAllowed = getQuarterChatMaxWidth(narrowViewport)
    const result = getRestoredQuarterChatWidth(preferred, narrowViewport)

    expect(result).toBe(maxAllowed)
    expect(result).toBeLessThan(preferred)
  })

  test('passive narrowing does not go below MIN_CHAT_PANEL_WIDTH', () => {
    const preferred = 453
    const tinyViewport = 400
    const result = getRestoredQuarterChatWidth(preferred, tinyViewport)
    expect(result).toBe(MIN_CHAT_PANEL_WIDTH)
  })

  test('user-set narrow preference (380px) is restored when viewport widens', () => {
    const userNarrow = 380
    const wideViewport = 1400
    expect(getRestoredQuarterChatWidth(userNarrow, wideViewport)).toBe(380)
  })

  test('user-set wide preference (600px) is clamped in narrow viewport', () => {
    const userWide = 600
    const mediumViewport = 900
    const maxAllowed = getQuarterChatMaxWidth(mediumViewport)
    const result = getRestoredQuarterChatWidth(userWide, mediumViewport)
    expect(result).toBe(Math.min(userWide, maxAllowed))
  })

  test('full cycle: narrow → widen → back to preferred width', () => {
    const preferred = 453

    // Step 1: Wide viewport — preference preserved
    const wideResult = getRestoredQuarterChatWidth(preferred, 1400)
    expect(wideResult).toBe(453)

    // Step 2: Narrow viewport — clamped
    const narrowResult = getRestoredQuarterChatWidth(preferred, 800)
    expect(narrowResult).toBeLessThan(453)

    // Step 3: Back to wide — restored
    const restoredResult = getRestoredQuarterChatWidth(preferred, 1400)
    expect(restoredResult).toBe(453)
  })

  /* ---- getQuarterChatMaxWidth edge cases ---- */

  test('getQuarterChatMaxWidth returns half available width for typical viewports', () => {
    expect(getQuarterChatMaxWidth(1000)).toBe(500)
  })

  test('getQuarterChatMaxWidth respects availableWidth - 80 floor', () => {
    // When available/2 > available - 80, the floor kicks in
    const result = getQuarterChatMaxWidth(120)
    expect(result).toBe(120)
  })

  test('getQuarterChatMaxWidth rounds to integer', () => {
    const result = getQuarterChatMaxWidth(901)
    expect(Number.isInteger(result)).toBe(true)
  })

  test('does not overwrite preferred quarter width when switching back from full mode', () => {
    expect(
      shouldUpdatePreferredQuarterChatWidth({
        chatMode: 'quarter',
        previousChatMode: 'full',
        chatWidth: 640,
        pendingAutoAdjustedWidth: null,
      }),
    ).toBe(false)
  })

  test('skips preferred width updates for passive auto-adjusted quarter widths', () => {
    expect(
      shouldUpdatePreferredQuarterChatWidth({
        chatMode: 'quarter',
        previousChatMode: 'quarter',
        chatWidth: 360,
        pendingAutoAdjustedWidth: 360,
      }),
    ).toBe(false)
  })

  test('keeps manual quarter drags as the preferred width', () => {
    expect(
      shouldUpdatePreferredQuarterChatWidth({
        chatMode: 'quarter',
        previousChatMode: 'quarter',
        chatWidth: 528,
        pendingAutoAdjustedWidth: 360,
      }),
    ).toBe(true)
  })
})
