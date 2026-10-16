// 通用类型定义

export interface Theme {
  background: string // 背景色
  primary: string // 主色
  primaryHover: string // 主色悬停态
  primaryForeground?: string // 主色上的文字色
  primaryText?: string // 白底或浅底上的主题文字色
  name: string
}

export interface Destination {
  key: string // 键值
  title: string // 标题
}

export interface SettingsMenuItem {
  key: string
  label: string
  icon: string
  action?: () => void
}

export interface ToolConfig {
  key: string
  label: string
  options?: {
    key: string
    label: string
  }[]
}

export interface SessionAction {
  key: string
  label: string
  icon: string
}

export interface ProjectAction {
  key: string
  label: string
  icon: string
}

export interface Version {
  id: string
  time: string
  text: string
}

export interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  onConfirm: (() => void) | null
}

export interface UsageRecord {
  id: string
  date: string
  action: string
  amount: number
  balance: number
}

export interface ReferralCode {
  code: string
  usedCount: number
  maxUses: number
  rewardAmount: number
  totalEarned: number
  createdAt: string
}

export interface ReferralRecord {
  id: string
  date: string
  type: 'used' | 'earned'
  code: string
  amount: number
}

export type ThemeKey =
  | 'green'
  | 'blue'
  | 'orange'
  | 'gray'
  | 'darkGreen'
  | 'darkBlue'
  | 'darkRed'
  | 'darkGray'
export type SettingsPage = 'profile' | 'balance' | 'usage' | 'modelPreferences' | 'data'
