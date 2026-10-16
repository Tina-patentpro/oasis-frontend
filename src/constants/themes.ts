// 主题相关常量

import type { Theme, ThemeKey } from '../types'

export const THEMES: Record<ThemeKey, Theme> = {
  // 浅色主题（使用300系列，更加清新的色调）
  green: { background: '#ecfdf5', primary: '#6ee7b7', primaryHover: '#34d399', primaryForeground: '#111827', primaryText: '#047857', name: '浅绿' },
  blue: { background: '#eff6ff', primary: '#93c5fd', primaryHover: '#60a5fa', primaryForeground: '#111827', primaryText: '#1d4ed8', name: '浅蓝' },
  orange: { background: '#fff7ed', primary: '#fdba74', primaryHover: '#fb923c', primaryForeground: '#111827', primaryText: '#c2410c', name: '浅橙' },
  gray: { background: '#f5f5f5', primary: '#d1d5db', primaryHover: '#9ca3af', primaryForeground: '#111827', primaryText: '#374151', name: '浅灰' },

  // 深色主题（75%深度，使用600系列）
  darkGreen: { background: '#059669', primary: '#10b981', primaryHover: '#34d399', primaryForeground: '#111827', primaryText: '#047857', name: '深绿' },
  darkBlue: { background: '#2563eb', primary: '#3b82f6', primaryHover: '#60a5fa', primaryForeground: '#111827', primaryText: '#1d4ed8', name: '深蓝' },
  darkRed: { background: '#dc2626', primary: '#ef4444', primaryHover: '#f87171', primaryForeground: '#111827', primaryText: '#b91c1c', name: '深红' },
  darkGray: { background: '#4b5563', primary: '#6b7280', primaryHover: '#9ca3af', primaryForeground: '#ffffff', primaryText: '#374151', name: '深灰' },
}
