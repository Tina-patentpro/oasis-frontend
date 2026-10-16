import { useCallback, useRef, useState } from 'react'

import { useAuthStore } from '@/stores/useAuthStore'
import { useUIStore } from '@/stores/useUIStore'
import { useClickOutside } from '@/hooks/useClickOutside'

interface UseNavigationBarStateParams {
  notificationCenterOpen: boolean
  setNotificationCenterOpen: (open: boolean) => void
  userMenuOpen: boolean
  setUserMenuOpen: (open: boolean) => void
  onSuggestionClick: () => void
  onReleaseNotesClick: () => void
  onHelpClick: () => void
  onCustomerServiceClick: () => void
}

export function useNavigationBarState({
  notificationCenterOpen,
  setNotificationCenterOpen,
  userMenuOpen,
  setUserMenuOpen,
  onSuggestionClick,
  onReleaseNotesClick,
  onHelpClick,
  onCustomerServiceClick,
}: UseNavigationBarStateParams) {
  const notificationBellRef = useRef<HTMLButtonElement>(null)
  const notificationCenterRef = useRef<HTMLDivElement>(null)
  const userMenuBtnRef = useRef<HTMLButtonElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  useClickOutside(
    [notificationBellRef, notificationCenterRef],
    () => setNotificationCenterOpen(false),
    notificationCenterOpen,
  )
  useClickOutside([userMenuBtnRef, userMenuRef], () => setUserMenuOpen(false), userMenuOpen)

  const handleNotificationToggle = useCallback(() => {
    setNotificationCenterOpen(!notificationCenterOpen)
  }, [notificationCenterOpen, setNotificationCenterOpen])

  const handleUserMenuToggle = useCallback(() => {
    setUserMenuOpen(!userMenuOpen)
  }, [userMenuOpen, setUserMenuOpen])

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      setUserMenuOpen(false)
      await logout()
    } catch (error) {
      console.error('退出登录失败:', error)
      useUIStore.getState().showToast('退出登录失败，请稍后重试')
    } finally {
      setIsLoggingOut(false)
    }
  }, [isLoggingOut, logout, setUserMenuOpen])

  const handleSuggestionClick = useCallback(() => {
    setUserMenuOpen(false)
    onSuggestionClick()
  }, [setUserMenuOpen, onSuggestionClick])

  const handleReleaseNotesClick = useCallback(() => {
    setUserMenuOpen(false)
    onReleaseNotesClick()
  }, [setUserMenuOpen, onReleaseNotesClick])

  const handleHelpClick = useCallback(() => {
    setUserMenuOpen(false)
    onHelpClick()
  }, [setUserMenuOpen, onHelpClick])

  const handleCustomerServiceClick = useCallback(() => {
    setUserMenuOpen(false)
    onCustomerServiceClick()
  }, [setUserMenuOpen, onCustomerServiceClick])

  const handleForceReload = useCallback(() => {
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }, [])

  return {
    notificationBellRef,
    notificationCenterRef,
    userMenuBtnRef,
    userMenuRef,
    isLoggingOut,
    user,
    handleNotificationToggle,
    handleUserMenuToggle,
    handleLogout,
    handleSuggestionClick,
    handleReleaseNotesClick,
    handleHelpClick,
    handleCustomerServiceClick,
    handleForceReload,
  }
}
