import type { SettingsPage } from '@/components/settings/constants'
import type { ChatMode } from '@/modules/workspace/stores'
import type { Theme, ThemeKey } from '@/types'

export interface NavigationBarProps {
  showSidebar: boolean
  onToggleSidebar: () => void
  chatMode: ChatMode
  onChangeChatMode: (mode: ChatMode) => void
  theme: ThemeKey
  currentTheme: Theme
  onThemeChange: (theme: ThemeKey) => void
  unreadCount: number
  notificationCenterOpen: boolean
  setNotificationCenterOpen: (open: boolean) => void
  userMenuOpen: boolean
  setUserMenuOpen: (open: boolean) => void
  onSuggestionClick: () => void
  onOpenSettingsPage: (page: SettingsPage) => void
  onReleaseNotesClick: () => void
  onHelpClick: () => void
  onCustomerServiceClick: () => void
  themes: Record<ThemeKey, Theme>
  tooltipsEnabled: boolean
  onToggleTooltips: (enabled: boolean) => void
}
