import { describe, expect, test } from '@jest/globals'

import { THEMES } from './themes'

function getRelativeLuminance(hexColor: string): number {
  const normalized = hexColor.replace('#', '')
  const channels = [0, 2, 4].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16) / 255)

  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function getContrastRatio(background: string, foreground: string): number {
  const backgroundLuminance = getRelativeLuminance(background)
  const foregroundLuminance = getRelativeLuminance(foreground)
  const lighter = Math.max(backgroundLuminance, foregroundLuminance)
  const darker = Math.min(backgroundLuminance, foregroundLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

describe('THEMES', () => {
  test('provides readable foreground text for every primary color', () => {
    Object.values(THEMES).forEach((theme) => {
      expect(theme.primaryForeground).toBeTruthy()
      expect(getContrastRatio(theme.primary, theme.primaryForeground ?? '#ffffff')).toBeGreaterThanOrEqual(4.5)
      expect(theme.primaryText).toBeTruthy()
      expect(getContrastRatio('#ffffff', theme.primaryText ?? theme.primary)).toBeGreaterThanOrEqual(4.5)
    })
  })
})
