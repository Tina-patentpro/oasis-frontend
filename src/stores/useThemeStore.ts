import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { THEMES } from '../constants/themes'
import type { Theme, ThemeKey } from '../types/common'

interface ThemeStore {
  hydrated: boolean
  theme: ThemeKey
  currentTheme: Theme
  setTheme: (theme: ThemeKey) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      hydrated: typeof window === 'undefined',
      theme: 'green',
      currentTheme: THEMES.green,
      setTheme: (theme) =>
        set({
          theme,
          currentTheme: THEMES[theme],
        }),
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (persistedState, error) => {
        let themeKey = persistedState?.theme ?? useThemeStore.getState().theme

        // 如果存储的主题不再有效（如 'orange' 被移除），回退到默认主题
        if (!THEMES[themeKey]) {
          themeKey = 'green'
        }

        queueMicrotask(() => {
          useThemeStore.setState({
            theme: themeKey,
            currentTheme: THEMES[themeKey],
            hydrated: true,
          })
        })
        if (error) {
          console.error('Failed to rehydrate theme store', error)
        }
      },
    },
  ),
)
