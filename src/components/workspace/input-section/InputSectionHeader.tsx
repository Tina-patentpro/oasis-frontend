import { type FC, type KeyboardEvent } from 'react'

import { Tooltip } from '../../ui'

import { getInputSectionPanelId, getInputSectionTabId } from './a11y'
import type { InputSectionHeaderProps } from './types'

export const InputSectionHeader: FC<InputSectionHeaderProps> = ({
  currentApiField,
  selectedProjectId,
  projects,
  onProjectChange,
  onQuickCreateProject,
  onStartNewSession,
  startNewSessionDisabled,
  startNewSessionTooltip,
  layoutMode,
  onLayoutModeChange,
  contentPages,
  inputPage,
  inputSections,
  onInputPageChange,
  baseActionStyle,
  tabsLoadError,
  onRetryLoadTabs,
}) => {
  const moveToTab = (index: number) => {
    const nextPage = contentPages[index]
    if (!nextPage) return

    onInputPageChange(nextPage.key)
    document.getElementById(getInputSectionTabId(nextPage.key))?.focus()
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (contentPages.length === 0) return

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveToTab((index + 1) % contentPages.length)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveToTab((index - 1 + contentPages.length) % contentPages.length)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      moveToTab(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      moveToTab(contentPages.length - 1)
    }
  }

  return (
    <div className="input-section-header-container sticky top-0 z-20 bg-white shadow-sm">
      <div className="input-section-header gap-3 border-b border-gray-200 py-3">
        <div className="input-section-header__title text-sm font-semibold text-gray-700">
          输入材料{currentApiField && ` - ${currentApiField.cn_name}`}
        </div>
        <div className="input-section-header__actions">
          <Tooltip
            content="选择要关联的项目，将当前会话与项目数据关联"
            className="input-section-header__project"
          >
            <select
              aria-label="选择关联项目"
              className="chat-action-btn w-full min-w-0 max-w-full cursor-pointer rounded-lg border bg-white px-3 py-1.5 text-xs transition-colors focus:outline-none"
              value={selectedProjectId ?? ''}
              onChange={(event) => {
                const value = event.target.value
                onProjectChange(value ? Number(value) : null)
              }}
              style={baseActionStyle}
            >
              {selectedProjectId === null && (
                <option value="" disabled hidden>
                  🔗 关联项目
                </option>
              )}
              {selectedProjectId !== null && <option value="">取消关联项目</option>}
              {selectedProjectId !== null &&
                !projects.some((project) => project.id === selectedProjectId) && (
                  <option value={selectedProjectId}>已关联 (项目不在列表中)</option>
                )}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Tooltip>

          <div className="input-section-header__quick-create relative">
            <Tooltip content="快速创建并关联一个新项目，将当前输入与项目资料打通" inlineChild>
              <button
                type="button"
                className="chat-action-btn h-10 w-10 rounded-lg flex items-center justify-center text-gray-600 text-base"
                onClick={onQuickCreateProject}
                aria-label="新建项目"
                style={baseActionStyle}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </Tooltip>
          </div>

          <Tooltip
            content={startNewSessionTooltip}
            className="input-section-header__new-session"
            inlineChild
          >
            <button
              type="button"
              className="chat-action-btn flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onStartNewSession}
              aria-label="新会话"
              disabled={startNewSessionDisabled}
              style={baseActionStyle}
            >
              新会话
            </button>
          </Tooltip>
        </div>

        <Tooltip
          content="调整工作区的布局模式，优化内容展示效果"
          className="input-section-header__layout"
          inlineChild
        >
          <select
            aria-label="选择布局模式"
            className="chat-action-btn max-w-full cursor-pointer whitespace-nowrap rounded-lg border bg-white px-3 py-1.5 text-xs transition-colors focus:outline-none"
            value={layoutMode}
            onChange={(e) => onLayoutModeChange(e.target.value as typeof layoutMode)}
            style={baseActionStyle}
          >
            <option value="auto">📐 自动</option>
            <option value="vertical">⬍ 上下</option>
          </select>
        </Tooltip>
      </div>

      <div className="flex flex-wrap gap-2 py-3 bg-white" role="tablist">
        {contentPages.map((page, idx) => {
          const isActive = inputPage === page.key
          const isFilled = Boolean(inputSections[page.key]?.trim())
          const tabClassName = [
            'chrome-tab',
            isFilled ? 'chrome-tab--filled' : '',
            isActive ? 'chrome-tab--active' : '',
            isActive && isFilled ? 'chrome-tab--active-filled' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <Tooltip key={`tab-${page.key}-${idx}`} content={`切换到${page.label}输入页面`}>
              <button
                type="button"
                className={tabClassName}
                onClick={() => onInputPageChange(page.key)}
                onKeyDown={(event) => handleTabKeyDown(event, idx)}
                id={getInputSectionTabId(page.key)}
                role="tab"
                aria-selected={isActive}
                aria-controls={getInputSectionPanelId(page.key)}
                tabIndex={isActive ? 0 : -1}
                aria-label={`${page.label}输入页面，${isFilled ? '已填写' : '未填写'}${isActive ? '，当前页' : ''}`}
              >
                {page.label}
              </button>
            </Tooltip>
          )
        })}
      </div>

      {contentPages.length === 0 && tabsLoadError && (
        <div className="flex items-center gap-2 px-1 py-2" role="alert" aria-live="assertive">
          <span className="text-sm text-red-500">{tabsLoadError}</span>
          {onRetryLoadTabs && (
            <button
              type="button"
              className="text-sm text-blue-500 hover:text-blue-700 underline"
              onClick={onRetryLoadTabs}
              aria-label="重试加载标签页"
            >
              重试
            </button>
          )}
        </div>
      )}
    </div>
  )
}
