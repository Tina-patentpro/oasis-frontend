import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ComponentProps } from 'react'

import type { SettingsPage } from '@/components/settings/constants'
import { NavigationBar } from '@/components/workspace'
import { THEMES } from '@/constants'
import { useNotificationCenter } from '@/app/providers/NotificationProvider'
import { useThemeStore } from '@/stores'
import type { Theme } from '@/types'

import { useWorkspaceUIStore, type ChatMode } from '../stores'

type NavigationBarProps = ComponentProps<typeof NavigationBar>

interface UseWorkspaceNavigationParams {
  onSuggestionClick: () => void
  onOpenSettingsPage: (page: SettingsPage) => void
  onReleaseNotesClick: () => void
  onHelpClick: () => void
  onCustomerServiceClick: () => void
}

interface UseWorkspaceNavigationResult {
  navigationBarProps: NavigationBarProps
  currentTheme: Theme
  showSidebar: boolean
  chatOpen: boolean
  chatMode: ChatMode
  isCompact: boolean
}

const COMPACT_WORKSPACE_MEDIA_QUERY = '(max-width: 639px)'

function getInitialCompactState(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(COMPACT_WORKSPACE_MEDIA_QUERY).matches
}

export function useWorkspaceNavigation({
  onSuggestionClick,
  onOpenSettingsPage,
  onReleaseNotesClick,
  onHelpClick,
  onCustomerServiceClick,
}: UseWorkspaceNavigationParams): UseWorkspaceNavigationResult {
  const theme = useThemeStore((state) => state.theme)
  const currentTheme = useThemeStore((state) => state.currentTheme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const {
    showSidebar,
    toggleSidebar,
    chatMode,
    setChatMode,
    hydrated,
    normalizeCompactSurface,
    setCompactSurface,
    userMenuOpen,
    setUserMenuOpen,
    tooltipsEnabled,
    setTooltipsEnabled,
  } = useWorkspaceUIStore()
  const { unreadCount } = useNotificationCenter()

  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(getInitialCompactState)

  const effectiveShowSidebar = showSidebar
  const effectiveChatMode = isCompact
    ? showSidebar
      ? 'off'
      : chatMode === 'off'
        ? 'off'
        : 'full'
    : chatMode

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_WORKSPACE_MEDIA_QUERY)
    const synchronizeCompactState = (compact: boolean) => {
      setIsCompact(compact)
      if (compact) {
        normalizeCompactSurface()
      }
    }
    const handleMediaChange = (event: MediaQueryListEvent) => {
      synchronizeCompactState(event.matches)
    }

    synchronizeCompactState(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleMediaChange)
    return () => mediaQuery.removeEventListener('change', handleMediaChange)
  }, [hydrated, normalizeCompactSurface])

  const handleToggleTooltips = useCallback(
    (enabled: boolean) => {
      setTooltipsEnabled(enabled)
    },
    [setTooltipsEnabled],
  )

  const handleToggleSidebar = useCallback(() => {
    if (!isCompact) {
      toggleSidebar()
      return
    }
    setCompactSurface(effectiveShowSidebar ? 'workflow' : 'sidebar')
  }, [effectiveShowSidebar, isCompact, setCompactSurface, toggleSidebar])

  const handleChangeChatMode = useCallback(
    (mode: typeof chatMode) => {
      if (!isCompact) {
        setChatMode(mode)
        return
      }
      setCompactSurface(mode === 'off' ? 'workflow' : 'chat')
    },
    [isCompact, setChatMode, setCompactSurface],
  )

  const navigationBarProps = useMemo<NavigationBarProps>(
    () => ({
      showSidebar: effectiveShowSidebar,
      onToggleSidebar: handleToggleSidebar,
      chatMode: effectiveChatMode,
      onChangeChatMode: handleChangeChatMode,
      theme,
      currentTheme,
      onThemeChange: setTheme,
      unreadCount,
      notificationCenterOpen,
      setNotificationCenterOpen,
      userMenuOpen,
      setUserMenuOpen,
      onSuggestionClick,
      onOpenSettingsPage,
      onReleaseNotesClick,
      onHelpClick,
      onCustomerServiceClick,
      themes: THEMES,
      tooltipsEnabled,
      onToggleTooltips: handleToggleTooltips,
    }),
    [
      effectiveChatMode,
      effectiveShowSidebar,
      currentTheme,
      handleChangeChatMode,
      handleToggleSidebar,
      notificationCenterOpen,
      onCustomerServiceClick,
      onHelpClick,
      onOpenSettingsPage,
      onReleaseNotesClick,
      onSuggestionClick,
      setTheme,
      setUserMenuOpen,
      theme,
      unreadCount,
      userMenuOpen,
      tooltipsEnabled,
      handleToggleTooltips,
    ],
  )

  return {
    navigationBarProps,
    currentTheme,
    showSidebar: effectiveShowSidebar,
    chatOpen: effectiveChatMode !== 'off',
    chatMode: effectiveChatMode,
    isCompact,
  }
}
