import { useEffect, useRef, useCallback, useMemo, type CSSProperties, type FC } from 'react'

import { useThemeStore } from '@/stores'
import type { Session } from '@/types/api'

import { ComponentErrorBoundary } from '../../error-boundaries'
import { ToolGroupSection } from './ToolGroupSection'
import { ManagementSection } from './ManagementSection'
import { handleMenuKeyboardNavigation } from './menu-keyboard'
import type { LeftSidebarProps } from './types'

/**
 * Main LeftSidebar component - coordinates tool selection and management sections
 */
const LeftSidebarContent: FC<LeftSidebarProps> = ({
  width,
  tab,
  tabs,
  tool,
  managementTab,
  showVersionInfo,
  sessions,
  independentSessionPagination,
  projects,
  projectListPagination,
  selectedProjectId,
  selectedSessionId,
  pendingSessionId,
  projectSessions,
  projectSessionPaginationByProject,
  childProjectsByParent,
  childProjectPaginationByParent,
  hasIndependentSessionBaseline,
  projectsBaselineCount,
  searchTerm,
  onSearchTermChange,
  projectStatusFilter,
  projectReorderEnabled,
  onProjectStatusFilterChange,
  renamingSessionId,
  renameValue,
  sessionMenuOpen,
  sessionMenuRefs,
  toolMetadataByName,
  onTabChange,
  onToolChange,
  onToolVersionChange,
  onManagementTabChange,
  onVersionInfoToggle,
  onRenameSession,
  onRenameValueChange,
  onConfirmRename,
  onCancelRename,
  onSessionMenuToggle,
  onAssociateProject,
  onDissociateProject,
  onExportSession,
  onDeleteSession,
  onSessionClick,
  onLoadMoreIndependentSessions,
  onProjectUpdate,
  onProjectArchiveToggle,
  onProjectDelete,
  onProjectSelect,
  onProjectReorder,
  onLoadMoreProjects,
  onEnsureProjectSessionsLoaded,
  onLoadMoreProjectSessions,
  onEnsureChildProjectsLoaded,
  onLoadMoreChildProjects,
}) => {
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Memoize currentTab; fallback to first tab to avoid transient empty tool list.
  const currentTab = useMemo(() => tabs.find((t) => t.k === tab) ?? tabs[0], [tabs, tab])

  // Theme styling
  const currentTheme = useThemeStore((state) => state.currentTheme)
  const themePrimary = currentTheme.primary
  const themeHover = currentTheme.primaryHover
  const themeBorder = `${themePrimary}26`
  const themeSoft = `${themePrimary}14`
  const themeShadow = `${themePrimary}30`

  const makePillStyle = useCallback(
    (active: boolean): CSSProperties =>
      ({
        '--chat-btn-bg': active ? themePrimary : '#ffffff',
        '--chat-btn-color': active ? '#ffffff' : '#4b5563',
        '--chat-btn-border': active ? `1px solid ${themePrimary}` : `1px solid ${themeBorder}`,
        '--chat-btn-hover-bg': active ? themeHover : themeSoft,
        '--chat-btn-hover-color': active ? '#ffffff' : themePrimary,
        '--chat-btn-hover-shadow': themeShadow,
        '--chat-btn-press-bg': active ? themeHover : `${themePrimary}26`,
        '--chat-btn-focus-ring': themePrimary,
        '--chat-btn-hover-translate': '-1px',
      }) as CSSProperties,
    [themePrimary, themeHover, themeBorder, themeSoft, themeShadow],
  )

  // Focus rename input when renaming
  useEffect(() => {
    if (renamingSessionId !== null) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [renamingSessionId])

  useEffect(() => {
    if (sessionMenuOpen === null) return
    sessionMenuRefs.current[sessionMenuOpen]?.menuRef
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
      ?.focus()
  }, [sessionMenuOpen, sessionMenuRefs])

  // Handle button ref assignment - avoid direct mutation
  const handleButtonRef = useCallback(
    (el: HTMLButtonElement | null, sessionId: number) => {
      if (el) {
        const current = sessionMenuRefs.current[sessionId]
        const updated = {
          btnRef: el,
          menuRef: current?.menuRef ?? null,
        }
        Object.assign(sessionMenuRefs.current, { [sessionId]: updated })
      }
    },
    [sessionMenuRefs],
  )

  // Handle menu ref assignment - avoid direct mutation
  const handleMenuRef = useCallback(
    (el: HTMLDivElement | null, sessionId: number) => {
      if (el) {
        const current = sessionMenuRefs.current[sessionId]
        const updated = {
          btnRef: current?.btnRef ?? null,
          menuRef: el,
        }
        Object.assign(sessionMenuRefs.current, { [sessionId]: updated })
      }
    },
    [sessionMenuRefs],
  )

  // Memoize tool metadata to avoid lookup on every render
  const activeToolMetadata = useMemo(
    () => toolMetadataByName[tool.name],
    [toolMetadataByName, tool.name],
  )

  // Memoize model versions processing
  const modelVersions = useMemo(
    () =>
      activeToolMetadata?.versions && activeToolMetadata.versions.length > 0
        ? activeToolMetadata.versions
        : [],
    [activeToolMetadata],
  )

  // Memoize selected version value calculation
  const selectedVersionValue = useMemo(
    () =>
      modelVersions.find((item) => item.id === tool.ver)?.id ??
      modelVersions.find((item) => item.name === tool.ver)?.id ??
      modelVersions[0]?.id ??
      '',
    [modelVersions, tool.ver],
  )

  // Session item render function (passed to ManagementSection)
  const renderSessionItem = useCallback(
    (session: Session, variant: 'standalone' | 'project') => {
      const optimisticMeta = (
        session as Session & {
          __optimistic?: {
            interactionLocked?: boolean
          }
        }
      ).__optimistic
      const isOptimisticLocked = optimisticMeta?.interactionLocked === true
      const formattedTime = new Date(session.updatedAt ?? session.createdAt).toLocaleString('zh-CN')
      const isSelectedSession = selectedSessionId === session.id
      const isPendingSession = pendingSessionId === session.id
      const containerClassName =
        variant === 'project'
          ? 'group relative ml-6 mt-1 rounded-lg border transition-[background-color,border-color,color,box-shadow,opacity,transform]'
          : `group relative rounded-lg border transition-[background-color,border-color,color,box-shadow,opacity,transform] ${
              isSelectedSession
                ? ''
                : 'border-gray-200 bg-gray-50/50 hover:border-emerald-200 hover:bg-gray-50'
            }`
      const containerStyle: CSSProperties | undefined =
        variant === 'project'
          ? {
              borderColor: isSelectedSession ? themePrimary : themeBorder,
              backgroundColor: isSelectedSession ? `${themePrimary}22` : `${themePrimary}14`,
              boxShadow: isSelectedSession ? `0 10px 24px ${themeShadow}` : undefined,
            }
          : isSelectedSession
            ? {
                borderColor: themePrimary,
                backgroundColor: `${themePrimary}12`,
                boxShadow: `0 10px 24px ${themeShadow}`,
              }
            : undefined
      const sessionMenuButtonVisibilityClass = isSelectedSession || sessionMenuOpen === session.id
          ? 'opacity-100'
          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100'
      const sessionMenuId = `session-menu-${session.id}`

      if (renamingSessionId === session.id) {
        return (
          <div
            key={session.id}
            className={containerClassName}
            style={containerStyle}
            aria-current={isSelectedSession ? 'true' : undefined}
          >
            {isSelectedSession && (
              <div
                className="pointer-events-none absolute left-1 top-2 bottom-2 w-1 rounded-full"
                style={{ backgroundColor: themePrimary }}
              />
            )}
            <div className="px-3 py-2 flex items-center gap-2">
              <input
                aria-label={`重命名会话 ${session.title}`}
                ref={renameInputRef}
                type="text"
                className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                value={renameValue}
                onChange={(e) => onRenameValueChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onConfirmRename()
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    onCancelRename()
                  }
                }}
                onBlur={onConfirmRename}
              />
            </div>
          </div>
        )
      }

      return (
        <div key={session.id} className={containerClassName} style={containerStyle}>
          {isSelectedSession && (
            <div
              className="pointer-events-none absolute left-1 top-2 bottom-2 w-1 rounded-full"
              style={{ backgroundColor: themePrimary }}
            />
          )}
          <div className="px-3 py-2 flex items-start justify-between">
            {isOptimisticLocked ? (
              <div className="flex-1 min-w-0" aria-disabled="true">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: isSelectedSession ? themePrimary : '#1f2937' }}
                >
                  {session.title}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: isSelectedSession ? themePrimary : '#6b7280' }}
                >
                  <span>{formattedTime}</span>
                  <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    生成中
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="flex-1 min-w-0 rounded text-left focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                onClick={() => onSessionClick?.(session)}
                aria-current={isSelectedSession ? 'true' : undefined}
                aria-busy={isPendingSession}
              >
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: isSelectedSession ? themePrimary : '#1f2937' }}
                >
                  {session.title}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: isSelectedSession ? themePrimary : '#6b7280' }}
                >
                  <span>{formattedTime}</span>
                  {isPendingSession && (
                    <span className="ml-2 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                      正在加载
                    </span>
                  )}
                </div>
              </button>
            )}
            {!isOptimisticLocked && (
              <div className="relative flex-shrink-0">
                <button
                  ref={(el) => handleButtonRef(el, session.id)}
                  type="button"
                  className={`p-1.5 rounded-full text-gray-500 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-light)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition-opacity ${sessionMenuButtonVisibilityClass}`}
                  aria-haspopup="menu"
                  aria-expanded={sessionMenuOpen === session.id}
                  aria-controls={sessionMenuOpen === session.id ? sessionMenuId : undefined}
                  aria-label={`打开会话菜单：${session.title}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSessionMenuToggle(sessionMenuOpen === session.id ? null : session.id)
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
                {sessionMenuOpen === session.id && (
                  <div
                    id={sessionMenuId}
                    ref={(el) => handleMenuRef(el, session.id)}
                    role="menu"
                    aria-label={`会话操作：${session.title}`}
                    onKeyDown={(event) =>
                      handleMenuKeyboardNavigation(event, {
                        onClose: () => onSessionMenuToggle(null),
                        returnFocusTo: sessionMenuRefs.current[session.id]?.btnRef,
                      })
                    }
                    className="absolute right-0 z-30 mt-2 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSessionMenuToggle(null)
                        onRenameSession(session)
                      }}
                    >
                      重命名
                    </button>
                    {variant === 'standalone' && (
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSessionMenuToggle(null)
                          onAssociateProject(session)
                        }}
                      >
                        关联项目
                      </button>
                    )}
                    {variant === 'project' && (
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSessionMenuToggle(null)
                          onAssociateProject(session)
                        }}
                      >
                        转移关联
                      </button>
                    )}
                    {variant === 'project' && (
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSessionMenuToggle(null)
                          onDissociateProject(session)
                        }}
                      >
                        取消关联
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSessionMenuToggle(null)
                        onExportSession(session)
                      }}
                    >
                      导出会话
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSessionMenuToggle(null)
                        onDeleteSession(session)
                      }}
                    >
                      删除会话
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    },
    [
      selectedSessionId,
      pendingSessionId,
      sessionMenuOpen,
      renamingSessionId,
      renameValue,
      themePrimary,
      themeBorder,
      themeShadow,
      sessionMenuRefs,
      handleButtonRef,
      handleMenuRef,
      onRenameValueChange,
      onConfirmRename,
      onCancelRename,
      onSessionClick,
      onSessionMenuToggle,
      onRenameSession,
      onAssociateProject,
      onDissociateProject,
      onExportSession,
      onDeleteSession,
    ],
  )

  return (
    <aside aria-label="工具与历史记录侧栏" className="border-r bg-white overflow-y-auto min-h-0" style={{ width, flexShrink: 0 }}>
      <div className="p-4 space-y-5">
        {/* Tool Group Section */}
        <ToolGroupSection
          tab={tab}
          tabs={tabs}
          tool={tool}
          currentTab={currentTab}
          showVersionInfo={showVersionInfo}
          modelVersions={modelVersions}
          selectedVersionValue={selectedVersionValue}
          activeToolMetadata={activeToolMetadata}
          toolMetadataByName={toolMetadataByName}
          makePillStyle={makePillStyle}
          onTabChange={onTabChange}
          onToolChange={onToolChange}
          onToolVersionChange={onToolVersionChange}
          onVersionInfoToggle={onVersionInfoToggle}
        />

        {/* Management Section (Session History + Project Management) */}
        <ManagementSection
          managementTab={managementTab}
          onManagementTabChange={onManagementTabChange}
          searchTerm={searchTerm}
          onSearchTermChange={onSearchTermChange}
          sessions={sessions}
          independentSessionPagination={independentSessionPagination}
          hasIndependentSessionBaseline={hasIndependentSessionBaseline}
          projects={projects}
          projectListPagination={projectListPagination}
          projectSessions={projectSessions}
          projectSessionPaginationByProject={projectSessionPaginationByProject}
          childProjectsByParent={childProjectsByParent}
          childProjectPaginationByParent={childProjectPaginationByParent}
          selectedProjectId={selectedProjectId}
          projectStatusFilter={projectStatusFilter}
          projectsBaselineCount={projectsBaselineCount}
          projectReorderEnabled={projectReorderEnabled}
          onProjectStatusFilterChange={onProjectStatusFilterChange}
          onProjectUpdate={onProjectUpdate}
          onProjectArchiveToggle={onProjectArchiveToggle}
          onProjectDelete={onProjectDelete}
          onProjectSelect={onProjectSelect}
          onProjectReorder={onProjectReorder}
          onLoadMoreProjects={onLoadMoreProjects}
          onEnsureProjectSessionsLoaded={onEnsureProjectSessionsLoaded}
          onLoadMoreProjectSessions={onLoadMoreProjectSessions}
          onEnsureChildProjectsLoaded={onEnsureChildProjectsLoaded}
          onLoadMoreChildProjects={onLoadMoreChildProjects}
          renamingSessionId={renamingSessionId}
          renameValue={renameValue}
          sessionMenuOpen={sessionMenuOpen}
          sessionMenuRefs={sessionMenuRefs}
          onRenameSession={onRenameSession}
          onRenameValueChange={onRenameValueChange}
          onConfirmRename={onConfirmRename}
          onCancelRename={onCancelRename}
          onSessionMenuToggle={onSessionMenuToggle}
          onAssociateProject={onAssociateProject}
          onDissociateProject={onDissociateProject}
          onExportSession={onExportSession}
          onDeleteSession={onDeleteSession}
          onSessionClick={onSessionClick}
          onLoadMoreIndependentSessions={onLoadMoreIndependentSessions}
          makePillStyle={makePillStyle}
          renderSessionItem={renderSessionItem}
        />
      </div>
    </aside>
  )
}

export const LeftSidebar: FC<LeftSidebarProps> = (props) => {
  return (
    <ComponentErrorBoundary componentName="LeftSidebar">
      <LeftSidebarContent {...props} />
    </ComponentErrorBoundary>
  )
}
