import { motion } from '@/components/ui/motion'
import React from 'react'

import type { SettingsMenuItem, SettingsPage } from '../constants'

interface SettingsSidebarProps {
  menu: readonly SettingsMenuItem[]
  currentPage: SettingsPage
  onSelect: (page: SettingsPage) => void
  onClose: () => void
  themeColor: string
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  menu,
  currentPage,
  onSelect,
  onClose,
  themeColor,
}) => (
  <aside className="w-full shrink-0 border-b bg-gray-50 p-4 sm:w-64 sm:border-b-0 sm:border-r">
    <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
      <h2 className="text-lg font-bold text-gray-900">设置</h2>
      <button
        type="button"
        onClick={onClose}
        className="h-8 w-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-600"
        aria-label="关闭设置"
      >
        ✕
      </button>
    </div>

    <nav className="flex gap-2 overflow-x-auto pb-1 sm:block sm:space-y-1 sm:overflow-visible sm:pb-0">
      {menu.map((item) => (
        <motion.button
          key={item.key}
          onClick={() => onSelect(item.key)}
          aria-current={currentPage === item.key ? 'page' : undefined}
          className={`min-w-max text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-colors sm:w-full sm:min-w-0 sm:px-4 sm:gap-3 ${
            currentPage === item.key ? 'font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
          style={
            currentPage === item.key
              ? {
                  backgroundColor: `${themeColor}15`,
                  color: themeColor,
                }
              : undefined
          }
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="text-sm">{item.label}</span>
        </motion.button>
      ))}
    </nav>
  </aside>
)

SettingsSidebar.displayName = 'SettingsSidebar'
