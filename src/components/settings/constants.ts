export interface SettingsMenuItem {
  key: SettingsPage
  label: string
  icon: string
}

export type SettingsPage = 'profile' | 'balance' | 'runningWater' | 'modelPreferences' | 'data'

export const SETTINGS_MENU: SettingsMenuItem[] = [
  { key: 'profile', label: '个人信息和推荐奖励', icon: '👤' },
  { key: 'balance', label: '充值/余额', icon: '💰' },
  { key: 'runningWater', label: '流水记录', icon: '💸' },
  { key: 'modelPreferences', label: '模型喜好设定', icon: '🧭' },
  { key: 'data', label: '数据管理', icon: '💾' },
]
