import type { RefObject } from 'react'

import type { ChatTabKey } from '../../types'
import { Tooltip } from '../ui'

import type { ChatTabOption } from './ChatPanel.constants'

interface ChatTabHeaderProps {
  availableTabs: ChatTabOption[]
  chatTab: ChatTabKey
  onTabChange: (tab: ChatTabKey) => void
  currentHint?: string
  showSearchButton: boolean
  onOpenSearch: () => void
  searchButtonRef?: RefObject<HTMLButtonElement | null>
}

export const ChatTabHeader = ({
  availableTabs,
  chatTab,
  onTabChange,
  currentHint,
  showSearchButton,
  onOpenSearch,
  searchButtonRef,
}: ChatTabHeaderProps) => {
  const activeIndex = Math.max(
    0,
    availableTabs.findIndex((tab) => tab.key === chatTab),
  )
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = availableTabs.length - 1
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = index === lastIndex ? 0 : index + 1
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = index === 0 ? lastIndex : index - 1
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = lastIndex
    }

    if (nextIndex === null) {
      return
    }

    event.preventDefault()
    const nextTabKey = availableTabs[nextIndex].key as ChatTabKey
    onTabChange(nextTabKey)
    requestAnimationFrame(() => {
      document.getElementById(`tab-${nextTabKey}`)?.focus()
    })
  }

  return (
    <>
      <div className="flex gap-2 px-3 pt-3" role="tablist">
        {availableTabs.map((tab, index) => (
          <div key={tab.key}>
            <Tooltip content={tab.hint || `${tab.label} - 点击切换到此对话模式`}>
              <button
                className={'chrome-tab ' + (chatTab === tab.key ? 'chrome-tab--active' : '')}
                onClick={() => onTabChange(tab.key as ChatTabKey)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                role="tab"
                type="button"
                aria-selected={chatTab === tab.key}
                aria-controls={`tabpanel-${tab.key}`}
                id={`tab-${tab.key}`}
                tabIndex={index === activeIndex ? 0 : -1}
              >
                {tab.label}
              </button>
            </Tooltip>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 leading-relaxed">
        <span>{currentHint}</span>
        {showSearchButton ? (
          <button
            ref={searchButtonRef}
            type="button"
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
            onClick={onOpenSearch}
            aria-label="搜索对话"
            title="搜索对话 (Ctrl+Shift+F)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        ) : null}
      </div>
    </>
  )
}
