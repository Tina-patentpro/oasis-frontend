import { AnimatePresence, motion } from '@/components/ui/motion'
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type MutableRefObject,
  type RefObject,
} from 'react'

import { SETTINGS_MENU, type SettingsPage } from '@/components/settings/constants'
import { dialogVariants } from '@/utils/animations'
import type { Theme, ThemeKey } from '@/types'
import { Tooltip } from '@/components/ui'
import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface ThemeSwatchProps {
  themeKey: ThemeKey
  currentTheme: ThemeKey
  themeDefinition: Theme
  onSelect: (key: ThemeKey) => void
}

const ThemeSwatch = memo(
  ({ themeKey, currentTheme, themeDefinition, onSelect }: ThemeSwatchProps) => {
    const handleSelect = useCallback(() => {
      onSelect(themeKey)
    }, [themeKey, onSelect])

    return (
      <div className="flex flex-col items-center gap-1">
        <Tooltip
          content={
            <div>
              <div className="font-medium">{themeDefinition.name}主题</div>
              <div className="text-xs opacity-90 mt-1">主色调: {themeDefinition.primary}</div>
              <div className="text-xs opacity-80 mt-0.5">点击应用此主题</div>
            </div>
          }
        >
          <button
            type="button"
            className={`h-8 w-8 rounded-full transition-[background-color,border-color,color,box-shadow,opacity,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${currentTheme === themeKey ? 'scale-110 ring-2 ring-offset-2' : 'hover:scale-105'}`}
            style={{
              backgroundColor: themeDefinition.primary,
              ...(currentTheme === themeKey
                ? { boxShadow: `0 0 0 2px white, 0 0 0 4px ${themeDefinition.primary}` }
                : {}),
            }}
            onClick={handleSelect}
            aria-pressed={currentTheme === themeKey}
            aria-label={`切换到${themeDefinition.name}主题`}
          />
        </Tooltip>
        <span
          className={`text-xs transition-colors ${currentTheme === themeKey ? 'text-gray-900 font-medium' : 'text-gray-500'}`}
        >
          {themeDefinition.name}
        </span>
      </div>
    )
  },
)

ThemeSwatch.displayName = 'ThemeSwatch'

interface ThemePaletteProps {
  options: ThemeKey[]
  currentTheme: ThemeKey
  themes: Record<ThemeKey, Theme>
  onThemeChange: (theme: ThemeKey) => void
  label: string
}

const ThemePalette = memo(
  ({ options, currentTheme, themes, onThemeChange, label }: ThemePaletteProps) => (
    <div className="flex gap-6 justify-center" role="group" aria-label={label}>
      {options.map((themeKey) => (
        <ThemeSwatch
          key={themeKey}
          themeKey={themeKey}
          currentTheme={currentTheme}
          themeDefinition={themes[themeKey]}
          onSelect={onThemeChange}
        />
      ))}
    </div>
  ),
)

ThemePalette.displayName = 'ThemePalette'

type UserMenuUser = {
  username?: string | null
  email?: string | null
  balance?: number | null
}

interface UserMenuPanelProps {
  userMenuOpen: boolean
  userMenuRef: RefObject<HTMLDivElement | null>
  user: UserMenuUser | null | undefined
  currentTheme: Theme
  theme: ThemeKey
  themes: Record<ThemeKey, Theme>
  tooltipsEnabled: boolean
  isLoggingOut: boolean
  onSuggestionClick: () => void
  onOpenSettingsPage: (page: SettingsPage) => void
  onReleaseNotesClick: () => void
  onHelpClick: () => void
  onCustomerServiceClick: () => void
  onThemeChange: (theme: ThemeKey) => void
  onToggleTooltips: (enabled: boolean) => void
  onForceReload: () => void
  onLogout: () => void
  setUserMenuOpen: (open: boolean) => void
}

export const UserMenuPanel: FC<UserMenuPanelProps> = ({
  userMenuOpen,
  userMenuRef,
  user,
  currentTheme,
  theme,
  themes,
  tooltipsEnabled,
  isLoggingOut,
  onSuggestionClick,
  onOpenSettingsPage,
  onReleaseNotesClick,
  onHelpClick,
  onCustomerServiceClick,
  onThemeChange,
  onToggleTooltips,
  onForceReload,
  onLogout,
  setUserMenuOpen,
}) => {
  const [forceReloadConfirmOpen, setForceReloadConfirmOpen] = useState(false)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const wasUserMenuOpenRef = useRef(false)
  const focusTrapRef = useFocusTrap(userMenuOpen)

  const setUserMenuPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      const writableUserMenuRef = userMenuRef as MutableRefObject<HTMLDivElement | null>
      writableUserMenuRef.current = node
      focusTrapRef.current = node
    },
    [focusTrapRef, userMenuRef],
  )

  const handleRequestForceReload = useCallback(() => {
    setForceReloadConfirmOpen(true)
  }, [])

  const handleCancelForceReload = useCallback(() => {
    setForceReloadConfirmOpen(false)
  }, [])

  const handleConfirmForceReload = useCallback(() => {
    setForceReloadConfirmOpen(false)
    onForceReload()
  }, [onForceReload])

  useEffect(() => {
    if (userMenuOpen && !wasUserMenuOpenRef.current) {
      previouslyFocusedElementRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      userMenuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    }

    wasUserMenuOpenRef.current = userMenuOpen
  }, [userMenuOpen, userMenuRef])

  const handleUserMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setUserMenuOpen(false)
      previouslyFocusedElementRef.current?.focus()
    },
    [setUserMenuOpen],
  )

  return (
    <>
      <AnimatePresence>
        {userMenuOpen && (
          <motion.div
            ref={setUserMenuPanelRef}
            id="workspace-user-menu"
            role="dialog"
            aria-label="用户菜单"
            tabIndex={-1}
            className="fixed left-2 right-2 top-[88px] z-50 mt-2 max-h-[calc(100vh-6rem)] w-auto origin-top-right overflow-y-auto rounded-xl border bg-white shadow-2xl sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:max-h-none sm:w-72 sm:max-w-[18rem] sm:overflow-hidden"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onKeyDown={handleUserMenuKeyDown}
          >
            <div className="px-5 py-4 border-b bg-gray-50">
              <div className="text-sm font-medium text-gray-900 mb-1">
                {user?.username || user?.email || '账户'}
              </div>
              <div className="text-xs text-gray-500 break-all">
                {user?.email ?? '未找到账户信息'}
              </div>
              {typeof user?.balance === 'number' && (
                <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  当前余额：
                  <span className="font-semibold">¥{user.balance.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="py-2">
              <Tooltip content="提交使用建议和反馈，获得积分奖励">
                <button
                  type="button"
                  className="w-full text-left px-5 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset"
                  onClick={onSuggestionClick}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ color: currentTheme.primary }}
                  >
                    <path d="M12 3l2.09 4.24 4.68.68-3.39 3.3.8 4.63L12 13.77 7.82 15.85l.8-4.63-3.39-3.3 4.68-.68L12 3z" />
                    <path d="M5 21h14" />
                    <path d="M9 17h6" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: currentTheme.primary }}>
                    有奖建议征集
                  </span>
                </button>
              </Tooltip>
              {SETTINGS_MENU.map((item) => (
                <Tooltip key={item.key} content={`打开${item.label}设置面板`}>
                  <button
                    type="button"
                    className="w-full text-left px-5 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset"
                    onClick={() => {
                      setUserMenuOpen(false)
                      onOpenSettingsPage(item.key)
                    }}
                  >
                    <span className="text-lg leading-none">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </button>
                </Tooltip>
              ))}
              <Tooltip content="查看每次版本发布新增了什么、优化了什么、修复了什么">
                <button
                  type="button"
                  className="w-full text-left px-5 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset"
                  onClick={onReleaseNotesClick}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M8 6h10" />
                    <path d="M8 12h10" />
                    <path d="M8 18h10" />
                    <path d="M3 6h.01" />
                    <path d="M3 12h.01" />
                    <path d="M3 18h.01" />
                  </svg>
                  <span className="text-sm">版本更新</span>
                </button>
              </Tooltip>
              <Tooltip content="查看使用指南、API文档和常见问题解答">
                <button
                  type="button"
                  className="w-full text-left px-5 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset"
                  onClick={onHelpClick}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  <span className="text-sm">帮助文档</span>
                </button>
              </Tooltip>
              <Tooltip content="通过微信或工单系统获取技术支持和帮助">
                <button
                  type="button"
                  className="w-full text-left px-5 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset"
                  onClick={onCustomerServiceClick}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className="text-sm">联系客服</span>
                </button>
              </Tooltip>
            </div>

            <div className="py-3 px-5 border-t">
              <div className="text-xs text-gray-500 mb-3">
                主题
                <span className="ml-2 text-gray-700 font-medium">· {themes[theme].name}</span>
              </div>
              <div className="flex flex-col gap-3">
                <ThemePalette
                  label="浅色主题"
                  options={['green', 'blue', 'orange', 'gray'] as ThemeKey[]}
                  currentTheme={theme}
                  themes={themes}
                  onThemeChange={onThemeChange}
                />
                <ThemePalette
                  label="深色主题"
                  options={['darkGreen', 'darkBlue', 'darkRed', 'darkGray'] as ThemeKey[]}
                  currentTheme={theme}
                  themes={themes}
                  onThemeChange={onThemeChange}
                />
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border bg-white px-4 py-3">
                <div className="text-sm text-gray-700">弹出气泡提示</div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={tooltipsEnabled}
                    onChange={(event) => onToggleTooltips(event.target.checked)}
                    aria-label="切换弹出气泡显示"
                  />
                  <span
                    className={`w-10 h-5 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400 peer-focus-visible:ring-offset-2 ${tooltipsEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  />
                  <span
                    className={`absolute left-0.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow transition-transform ${tooltipsEnabled ? 'translate-x-5' : ''}`}
                  />
                </label>
              </div>

              <button
                type="button"
                className="mt-4 flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left cursor-pointer hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                onClick={handleRequestForceReload}
              >
                <div className="text-sm text-gray-700">强制重新加载</div>
                <div className="p-1.5" style={{ color: themes[theme].primary }}>
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </div>
              </button>
            </div>

            <div className="border-t">
              <Tooltip content="退出当前账户，清除本地会话数据">
                <button
                  type="button"
                  className="w-full text-left px-5 py-3 hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={onLogout}
                  disabled={isLoggingOut}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span className="text-sm font-medium">{isLoggingOut ? '正在登出…' : '登出'}</span>
                </button>
              </Tooltip>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AccessibleDialog
        isOpen={forceReloadConfirmOpen}
        onClose={handleCancelForceReload}
        labelledBy="force-reload-confirm-title"
        describedBy="force-reload-confirm-description"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        overlayClassName="bg-black/40 backdrop-blur-sm"
      >
        <h2 id="force-reload-confirm-title" className="text-lg font-semibold text-gray-900">
          确认强制重新加载
        </h2>
        <p id="force-reload-confirm-description" className="mt-3 text-sm leading-6 text-gray-600">
          该操作会清空本机浏览器里的临时缓存并刷新页面。取消不会清空任何数据。
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
            onClick={handleCancelForceReload}
          >
            取消
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
            onClick={handleConfirmForceReload}
          >
            确认重新加载
          </button>
        </div>
      </AccessibleDialog>
    </>
  )
}
