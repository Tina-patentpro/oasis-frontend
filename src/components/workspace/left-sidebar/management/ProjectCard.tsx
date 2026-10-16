import { useEffect, useRef, type FC, type ReactNode } from 'react'

import type { Project, Session } from '@/types/api'
import type { ProjectListPagination, ProjectSessionPagination } from '../types'
import { handleMenuKeyboardNavigation } from '../menu-keyboard'
import { ProjectDragHandle } from './ProjectDragHandle'
import { VirtualSessionList } from './VirtualSessionList'

interface ProjectCardProps {
  project: Project
  sessionsForProject: Session[]
  sessionPagination?: ProjectSessionPagination
  childProjects?: Project[]
  childProjectPagination?: ProjectListPagination
  isExpanded: boolean
  isActive: boolean
  projectMenuOpen: number | null
  onSetProjectMenuOpen: (projectId: number | null) => void
  projectCardRef: (el: HTMLDivElement | null) => void
  editingProjectNameId: number | null
  editingProjectCustomerId: number | null
  projectNameDraft: string
  projectCustomerDraft: string
  onSetProjectNameDraft: (value: string) => void
  onSetProjectCustomerDraft: (value: string) => void
  onSetProjectNameInputRef: (el: HTMLInputElement | null) => void
  onSetProjectCustomerInputRef: (el: HTMLInputElement | null) => void
  onBeginProjectNameEdit: (project: Project) => void
  onCancelProjectNameEdit: (projectId: number) => void
  onCommitProjectNameEdit: (project: Project) => Promise<void>
  onBeginProjectCustomerEdit: (project: Project) => void
  onCancelProjectCustomerEdit: (projectId: number) => void
  onCommitProjectCustomerEdit: (project: Project) => Promise<void>
  onProjectSelect: (project: Project | null) => void
  onProjectArchiveToggle: (project: Project) => void
  onProjectDelete: (project: Project) => void
  onToggleProjectExpanded: (projectId: number) => void
  onEnsureSessionsLoaded: (projectId: number) => Promise<void> | void
  onLoadMoreSessions: (projectId: number) => Promise<void> | void
  onEnsureChildProjectsLoaded: (parentId: number) => Promise<void> | void
  onLoadMoreChildProjects: (parentId: number) => Promise<void> | void
  renderSessionItem: (session: Session, variant: 'standalone' | 'project') => ReactNode
  dragEnabled?: boolean
  isDragging?: boolean
  onDragHandleStart?: () => void
  onDragHandleEnd?: () => void
}

export const ProjectCard: FC<ProjectCardProps> = ({
  project,
  sessionsForProject,
  sessionPagination,
  childProjects,
  childProjectPagination,
  isExpanded,
  isActive,
  projectMenuOpen,
  onSetProjectMenuOpen,
  projectCardRef,
  editingProjectNameId,
  editingProjectCustomerId,
  projectNameDraft,
  projectCustomerDraft,
  onSetProjectNameDraft,
  onSetProjectCustomerDraft,
  onSetProjectNameInputRef,
  onSetProjectCustomerInputRef,
  onBeginProjectNameEdit,
  onCancelProjectNameEdit,
  onCommitProjectNameEdit,
  onBeginProjectCustomerEdit,
  onCancelProjectCustomerEdit,
  onCommitProjectCustomerEdit,
  onProjectSelect,
  onProjectArchiveToggle,
  onProjectDelete,
  onToggleProjectExpanded,
  onEnsureSessionsLoaded,
  onLoadMoreSessions,
  onEnsureChildProjectsLoaded,
  onLoadMoreChildProjects,
  renderSessionItem,
  dragEnabled = false,
  isDragging = false,
  onDragHandleStart,
  onDragHandleEnd,
}) => {
  const projectMenuButtonRef = useRef<HTMLButtonElement>(null)
  const projectMenuRef = useRef<HTMLDivElement>(null)
  const metadataCustomer =
    typeof project.metadata?.['customerName'] === 'string'
      ? (project.metadata?.['customerName'] as string)
      : ''
  const displayCustomer = project.customerName ?? metadataCustomer
  const pagination = sessionPagination ?? {
    initialized: false,
    isLoading: false,
    isInitialLoading: false,
    isRefreshing: false,
    isLoadingMore: false,
    hasMore: false,
    loadedCount: sessionsForProject.length,
    total: sessionsForProject.length,
  }
  const hasLoaded = pagination.initialized
  const hasSessions = sessionsForProject.length > 0
  const childItems = childProjects ?? []
  const childPagination = childProjectPagination ?? {
    initialized: false,
    isLoading: false,
    hasMore: false,
    loadedCount: childItems.length,
    total: childItems.length,
  }
  const childCount = project.childCount ?? childPagination.total
  const hasChildren = project.hasChildren ?? childCount > 0
  const projectMenuId = `project-menu-${project.id}`
  const projectSessionsPanelId = `project-sessions-${project.id}`

  useEffect(() => {
    if (projectMenuOpen !== project.id) {
      return
    }

    projectMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [project.id, projectMenuOpen])

  useEffect(() => {
    if (!isExpanded || pagination.initialized || pagination.isLoading) {
      return
    }
    void onEnsureSessionsLoaded(project.id)
  }, [isExpanded, onEnsureSessionsLoaded, pagination.initialized, pagination.isLoading, project.id])

  useEffect(() => {
    if (!isExpanded || !hasChildren || childPagination.initialized || childPagination.isLoading) {
      return
    }
    void onEnsureChildProjectsLoaded(project.id)
  }, [
    childPagination.initialized,
    childPagination.isLoading,
    hasChildren,
    isExpanded,
    onEnsureChildProjectsLoaded,
    project.id,
  ])

  const handleProjectCardClick = () => {
    onProjectSelect(isActive ? null : project)
    if (!isExpanded) {
      onToggleProjectExpanded(project.id)
    }
  }

  return (
    <div
      key={project.id}
      ref={projectCardRef}
      role="article"
      aria-label={`项目: ${project.name}`}
      className={`rounded-xl transition-[background-color,border-color,color,box-shadow,opacity,transform] ${
        isActive
          ? 'border-2 border-emerald-400 shadow-md'
          : 'border border-gray-200 hover:border-emerald-200'
      } ${isDragging ? 'opacity-70' : ''}`}
    >
      <div className={`p-3 ${isActive ? 'bg-emerald-50' : 'bg-gray-50'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <ProjectDragHandle
              dragEnabled={dragEnabled}
              projectId={project.id}
              projectName={project.name}
              onDragHandleStart={onDragHandleStart}
              onDragHandleEnd={onDragHandleEnd}
            />
            {editingProjectNameId === project.id ? (
              <input
                aria-label={`编辑项目名称 ${project.name}`}
                type="text"
                ref={onSetProjectNameInputRef}
                value={projectNameDraft}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onSetProjectNameDraft(event.target.value)}
                onBlur={() => {
                  void onCommitProjectNameEdit(project)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void onCommitProjectNameEdit(project)
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    onCancelProjectNameEdit(project.id)
                  }
                }}
                className="flex-1 min-w-0 rounded border border-emerald-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  handleProjectCardClick()
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  onBeginProjectNameEdit(project)
                }}
                className="flex-1 min-w-0 rounded text-left text-sm font-medium text-gray-800 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1"
              >
                {project.name}
              </button>
            )}
          </div>
          <div className="relative flex-shrink-0">
            <button
              ref={projectMenuButtonRef}
              type="button"
              className="p-1.5 rounded-full text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-haspopup="menu"
              aria-expanded={projectMenuOpen === project.id}
              aria-controls={projectMenuOpen === project.id ? projectMenuId : undefined}
              aria-label={`打开项目菜单：${project.name}`}
              onClick={(event) => {
                event.stopPropagation()
                onSetProjectMenuOpen(projectMenuOpen === project.id ? null : project.id)
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {projectMenuOpen === project.id && (
              <div
                id={projectMenuId}
                ref={projectMenuRef}
                role="menu"
                aria-label={`项目操作：${project.name}`}
                onKeyDown={(event) =>
                  handleMenuKeyboardNavigation(event, {
                    onClose: () => onSetProjectMenuOpen(null),
                    returnFocusTo: projectMenuButtonRef.current,
                  })
                }
                className="absolute right-0 z-30 mt-2 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    onSetProjectMenuOpen(null)
                    onProjectArchiveToggle(project)
                  }}
                >
                  {project.status === 'active' ? '转为归档' : '恢复为进行中'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    onSetProjectMenuOpen(null)
                    onProjectDelete(project)
                  }}
                >
                  删除项目
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          <span className="text-gray-500">客户</span>
          {editingProjectCustomerId === project.id ? (
            <input
              aria-label={`编辑项目客户 ${project.name}`}
              type="text"
              ref={onSetProjectCustomerInputRef}
              value={projectCustomerDraft}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onSetProjectCustomerDraft(event.target.value)}
              onBlur={() => {
                void onCommitProjectCustomerEdit(project)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void onCommitProjectCustomerEdit(project)
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  onCancelProjectCustomerEdit(project.id)
                }
              }}
              className="ml-1 rounded border border-emerald-300 px-1 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                handleProjectCardClick()
              }}
              onDoubleClick={(event) => {
                event.stopPropagation()
                onBeginProjectCustomerEdit(project)
              }}
              className="ml-1 rounded text-gray-600 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1"
            >
              {displayCustomer || '(未填写)'}
            </button>
          )}
        </div>
        <div className="mt-1 text-[11px] text-gray-500">
          会话数：
          {typeof project.sessionCount === 'number' ? project.sessionCount : '待统计'}
          <span className="mx-1">|</span>
          子项目：
          {typeof childCount === 'number' ? childCount : 0}
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleProjectExpanded(project.id)
          }}
          className="mt-3 flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-emerald-600"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? projectSessionsPanelId : undefined}
        >
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>
            {pagination.isInitialLoading && !hasLoaded
              ? '正在加载…'
              : !hasLoaded
                ? '点击加载'
                : hasSessions
                  ? `${Math.max(pagination.total, sessionsForProject.length)} 个会话`
                  : '暂无会话'}
          </span>
        </button>
        {isExpanded && (
          <div
            id={projectSessionsPanelId}
            className="mt-2 space-y-1"
            onClick={(event) => {
              event.stopPropagation()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation()
              }
            }}
          >
            {pagination.isInitialLoading && !pagination.initialized ? (
              <div className="ml-4 py-2 text-xs text-gray-500">正在加载会话…</div>
            ) : !pagination.initialized ? (
              <button
                type="button"
                className="ml-4 py-2 text-xs text-emerald-600 hover:text-emerald-700"
                onClick={(event) => {
                  event.stopPropagation()
                  void onEnsureSessionsLoaded(project.id)
                }}
              >
                点击加载会话
              </button>
            ) : sessionsForProject.length > 0 ? (
              <VirtualSessionList
                sessions={sessionsForProject}
                variant="project"
                renderSessionItem={renderSessionItem}
                footer={
                  pagination.hasMore || pagination.isLoadingMore ? (
                    <button
                      type="button"
                      className="ml-6 mt-2 text-xs text-emerald-600 hover:text-emerald-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                      disabled={pagination.isLoadingMore || !pagination.hasMore}
                      onClick={(event) => {
                        event.stopPropagation()
                        void onLoadMoreSessions(project.id)
                      }}
                    >
                      {pagination.isLoadingMore
                        ? '正在加载…'
                        : `加载更多 (${pagination.loadedCount}/${pagination.total})`}
                    </button>
                  ) : null
                }
              />
            ) : (
              <div className="ml-4 py-2 text-xs text-gray-500 flex items-center gap-1">
                <span>暂无会话</span>
                <span className="text-gray-500">可在右侧会话菜单中关联项目</span>
              </div>
            )}
            {(hasChildren || childPagination.initialized) && (
              <div className="mt-2 ml-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-emerald-700">
                    子项目
                    {typeof childCount === 'number' ? `（${childCount}）` : ''}
                  </div>
                  {!childPagination.initialized && (
                    <button
                      type="button"
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                      onClick={(event) => {
                        event.stopPropagation()
                        void onEnsureChildProjectsLoaded(project.id)
                      }}
                    >
                      点击加载
                    </button>
                  )}
                </div>
                {childPagination.initialized &&
                  childItems.length === 0 &&
                  !childPagination.isLoading && (
                    <div className="mt-2 text-xs text-gray-500">暂无子项目</div>
                  )}
                {childItems.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {childItems.map((childProject) => (
                      <div
                        key={childProject.id}
                        className="rounded border border-emerald-100 bg-white/80 px-2 py-1 text-xs text-gray-600"
                      >
                        <div className="font-medium text-gray-700 truncate">
                          {childProject.name}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          会话数：
                          {typeof childProject.sessionCount === 'number'
                            ? childProject.sessionCount
                            : '待统计'}
                          <span className="mx-1">|</span>
                          子项目：
                          {typeof childProject.childCount === 'number'
                            ? childProject.childCount
                            : 0}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(childPagination.hasMore || childPagination.isLoading) && (
                  <button
                    type="button"
                    className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                    disabled={childPagination.isLoading || !childPagination.hasMore}
                    onClick={(event) => {
                      event.stopPropagation()
                      void onLoadMoreChildProjects(project.id)
                    }}
                  >
                    {childPagination.isLoading
                      ? '正在加载…'
                      : `加载更多子项目 (${childPagination.loadedCount}/${childPagination.total})`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
