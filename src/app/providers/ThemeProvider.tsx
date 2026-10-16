import { ReactNode, useEffect } from 'react'

import { useThemeStore } from '@/stores/useThemeStore'
import type { Theme } from '@/types/common'

type ThemeCssVariableKey = keyof Pick<Theme, 'background' | 'primary' | 'primaryHover'>

const THEME_VARIABLES: Array<[string, ThemeCssVariableKey]> = [
  ['--theme-bg', 'background'],
  ['--theme-primary', 'primary'],
  ['--theme-primary-hover', 'primaryHover'],
]

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { currentTheme } = useThemeStore()

  useEffect(() => {
    THEME_VARIABLES.forEach(([cssVar, key]) => {
      document.documentElement.style.setProperty(cssVar, currentTheme[key])
    })
    document.body.style.backgroundColor = currentTheme.background
  }, [currentTheme])

  return <>{children}</>
}
