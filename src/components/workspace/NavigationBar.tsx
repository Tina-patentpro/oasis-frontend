import React, { memo, type CSSProperties } from 'react'

import { NotificationBell, NotificationCenter } from '@/components/NotificationCenter'
import { Tooltip } from '@/components/ui'
import { APP_VERSION_LABEL } from '@/constants/appMeta'

import {
  AsyncTaskMenu,
  ChatModeSwitch,
  getActiveSegmentLeft,
  getChatModeHint,
  getHeaderButtonStyle,
  isDarkTheme,
  UserMenuPanel,
  useNavigationBarState,
} from './navigation'
import type { NavigationBarProps } from './navigation'

interface NotificationSectionProps {
  unreadCount: number
  isOpen: boolean
  onToggle: () => void
  themeColor: string
  buttonRef: React.RefObject<HTMLButtonElement | null>
  panelRef: React.RefObject<HTMLDivElement | null>
  buttonClassName?: string
  buttonStyle?: CSSProperties
}

const NotificationSection: React.FC<NotificationSectionProps> = memo(
  ({
    unreadCount,
    isOpen,
    onToggle,
    themeColor,
    buttonRef,
    panelRef,
    buttonClassName,
    buttonStyle,
  }) => {
    const panelId = 'notification-center-panel'
    return (
      <div className="relative">
        <NotificationBell
          ref={buttonRef}
          unreadCount={unreadCount}
          onClick={onToggle}
          themeColor={themeColor}
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          className={buttonClassName}
          style={buttonStyle}
        />
        {isOpen && (
          <div
            ref={panelRef}
            className="fixed left-2 right-2 top-[88px] z-50 sm:absolute sm:left-auto sm:right-0 sm:top-11"
          >
            <NotificationCenter
              id={panelId}
              themeColor={themeColor}
              onClose={() => {
                onToggle()
                buttonRef.current?.focus()
              }}
            />
          </div>
        )}
      </div>
    )
  },
)

NotificationSection.displayName = 'NotificationSection'

export const NavigationBar: React.FC<NavigationBarProps> = ({
  showSidebar,
  onToggleSidebar,
  chatMode,
  onChangeChatMode,
  theme,
  currentTheme,
  onThemeChange,
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
  themes,
  tooltipsEnabled,
  onToggleTooltips,
}) => {
  const {
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
  } = useNavigationBarState({
    notificationCenterOpen,
    setNotificationCenterOpen,
    userMenuOpen,
    setUserMenuOpen,
    onSuggestionClick,
    onReleaseNotesClick,
    onHelpClick,
    onCustomerServiceClick,
  })

  const themeIsDark = isDarkTheme(theme)
  const textColor = themeIsDark ? 'text-white' : 'text-gray-700'
  const headerBtnStyle = getHeaderButtonStyle(themeIsDark, currentTheme)
  const chatModeHint = getChatModeHint(chatMode)
  const activeSegmentLeft = getActiveSegmentLeft(chatMode)
  const handleOpenSettingsPage = (page: Parameters<typeof onOpenSettingsPage>[0]) => {
    userMenuBtnRef.current?.focus()
    onOpenSettingsPage(page)
  }

  return (
    <nav
      className="grid h-[88px] grid-cols-[44px_minmax(0,1fr)_auto] grid-rows-[44px_44px] items-center border-b px-2 sm:h-11 sm:grid-cols-3 sm:grid-rows-1"
      style={{ backgroundColor: currentTheme.background }}
    >
      <div className="col-start-1 row-start-1 flex items-center gap-2 sm:col-auto sm:row-auto">
        <Tooltip
          content={
            <div>
              <div>{showSidebar ? '隐藏侧边栏' : '显示侧边栏'}</div>
              <div className="text-xs opacity-80 mt-1">快捷键: Ctrl + E</div>
            </div>
          }
          inlineChild
          position="bottom"
          align="start"
        >
          <button
            type="button"
            className="chat-action-btn h-10 w-10 rounded-lg flex items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
            onClick={onToggleSidebar}
            aria-label={showSidebar ? '隐藏侧边栏' : '显示侧边栏'}
            style={{ ...headerBtnStyle, '--chat-btn-hover-translate': '0px' } as CSSProperties}
          >
            {showSidebar ? '<' : '>'}
          </button>
        </Tooltip>
      </div>

      <div className="col-start-2 row-start-1 flex min-w-0 items-center justify-center sm:col-auto sm:row-auto">
        <div className={`flex items-center gap-2 text-sm font-medium ${textColor}`}>
          <img
            src="/workspace-logo.webp"
            alt="绿洲慧写品牌标识"
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
          />
          <span className="sm:hidden">绿洲慧写</span>
          <span className="hidden sm:inline">绿洲慧写 · 工作区</span>
          <span className="hidden select-none whitespace-nowrap text-xs font-medium opacity-70 sm:inline">
            {APP_VERSION_LABEL}
          </span>
        </div>
      </div>

      <div className="contents sm:relative sm:col-start-3 sm:row-start-1 sm:flex sm:items-center sm:justify-end sm:gap-2 sm:pr-1">
        <div className="col-span-3 row-start-2 flex flex-row-reverse items-center justify-between px-1 sm:contents">
          <AsyncTaskMenu
            currentTheme={currentTheme}
            isDarkTheme={themeIsDark}
            headerBtnStyle={headerBtnStyle}
          />

          <ChatModeSwitch
            chatMode={chatMode}
            chatModeHint={chatModeHint}
            activeSegmentLeft={activeSegmentLeft}
            currentTheme={currentTheme}
            isDarkTheme={themeIsDark}
            onChangeChatMode={onChangeChatMode}
          />
        </div>

        <div className="col-start-3 row-start-1 flex items-center justify-end gap-1 sm:contents">
          <NotificationSection
            unreadCount={unreadCount}
            isOpen={notificationCenterOpen}
            onToggle={handleNotificationToggle}
            themeColor={currentTheme.primary}
            buttonRef={notificationBellRef}
            panelRef={notificationCenterRef}
            buttonClassName="chat-action-btn"
            buttonStyle={{
              ...headerBtnStyle,
              '--chat-btn-hover-translate': '0px',
            } as CSSProperties}
          />

          <div className="relative">
            <Tooltip content="展开用户菜单" inlineChild position="bottom" align="end">
              <button
                type="button"
                ref={userMenuBtnRef}
                className="chat-action-btn h-10 w-10 rounded-lg flex items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                onClick={handleUserMenuToggle}
                aria-label="用户菜单"
                aria-haspopup="dialog"
                aria-expanded={userMenuOpen}
                aria-controls={userMenuOpen ? 'workspace-user-menu' : undefined}
                style={
                  { ...headerBtnStyle, '--chat-btn-hover-translate': '0px' } as CSSProperties
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </button>
            </Tooltip>

            <UserMenuPanel
              userMenuOpen={userMenuOpen}
              userMenuRef={userMenuRef}
              user={user}
              currentTheme={currentTheme}
              theme={theme}
              themes={themes}
              tooltipsEnabled={tooltipsEnabled}
              isLoggingOut={isLoggingOut}
              onSuggestionClick={handleSuggestionClick}
              onOpenSettingsPage={handleOpenSettingsPage}
              onReleaseNotesClick={handleReleaseNotesClick}
              onHelpClick={handleHelpClick}
              onCustomerServiceClick={handleCustomerServiceClick}
              onThemeChange={onThemeChange}
              onToggleTooltips={onToggleTooltips}
              onForceReload={handleForceReload}
              onLogout={handleLogout}
              setUserMenuOpen={setUserMenuOpen}
            />
          </div>
        </div>
      </div>
    </nav>
  )
}
