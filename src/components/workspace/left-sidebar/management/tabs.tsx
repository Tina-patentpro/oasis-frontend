import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type FC,
  type ReactNode,
} from 'react'

import type { Project, Session } from '@/types/api'
import type { ProjectListPagination, ProjectSessionPagination } from '../types'

import { ProjectCard } from './ProjectCard'
import { VirtualSessionList } from './VirtualSessionList'

interface HistoryTabContentProps {
  sessions: Session[]
  searchActive: boolean
  independentSessionPagination: ProjectSessionPagination
  hasIndependentSessionBaseline: boolean
  onLoadMoreIndependentSessions: () => Promise<void> | void
  renderSessionItem: (session: Session, variant: 'standalone' | 'project') => ReactNode
}

export const HistoryTabContent: FC<HistoryTabContentProps> = ({
  sessions,
  searchActive,
  independentSessionPagination,
  hasIndependentSessionBaseline,
  onLoadMoreIndependentSessions,
  renderSessionItem,
}) => (
  <div className="space-y-2">
    {independentSessionPagination.isLoading && !independentSessionPagination.initialized ? (
      <div className="text-center py-6 text-gray-500">
        <div className="text-sm">正在加载会话…</div>
      </div>
    ) : sessions.length === 0 ? (
      searchActive ? (
        <div className="text-center py-6 text-gray-500">
          <div className="text-sm">未找到匹配的会话</div>
          <div className="text-xs mt-1 text-gray-500">可以尝试调整关键字</div>
        </div>
      ) : hasIndependentSessionBaseline ? (
        <div className="text-center py-6 text-gray-500">
          <div className="text-sm">暂无匹配会话</div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📝</div>
          <div className="text-sm">还没有独立会话</div>
          <div className="text-xs mt-1">所有会话均已关联项目</div>
        </div>
      )
    ) : (
      <VirtualSessionList
        sessions={sessions}
        variant="standalone"
        renderSessionItem={renderSessionItem}
        footer={
          independentSessionPagination.hasMore || independentSessionPagination.isLoading ? (
            <button
              type="button"
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-gray-200 disabled:bg-gray-50"
              disabled={
                independentSessionPagination.isLoading || !independentSessionPagination.hasMore
              }
              onClick={() => {
                void onLoadMoreIndependentSessions()
              }}
            >
              {independentSessionPagination.isLoading
                ? '正在加载…'
                : `加载更多 (${independentSessionPagination.loadedCount}/${independentSessionPagination.total})`}
            </button>
          ) : null
        }
      />
    )}
  </div>
)

interface ProjectTabContentProps {
  projectStatusFilter: 'active' | 'archived'
  onProjectStatusFilterChange: (value: 'active' | 'archived') => void
  dragEnabled: boolean
  projects: Project[]
  projectListPagination: ProjectListPagination
  projectsBaselineCount: number
  projectSessions: Record<number, Session[]>
  projectSessionPaginationByProject: Record<number, ProjectSessionPagination>
  childProjectsByParent: Record<number, Project[]>
  childProjectPaginationByParent: Record<number, ProjectListPagination>
  selectedProjectId: number | null
  manualExpandedProjects: Record<number, boolean>
  getDefaultProjectExpanded: (projectId: number) => boolean
  toggleProjectExpanded: (projectId: number) => void
  editingProjectNameId: number | null
  editingProjectCustomerId: number | null
  projectNameDrafts: Record<number, string>
  projectCustomerDrafts: Record<number, string>
  setProjectNameDraft: (projectId: number, value: string) => void
  setProjectCustomerDraft: (projectId: number, value: string) => void
  setProjectNameInputRef: (projectId: number, el: HTMLInputElement | null) => void
  setProjectCustomerInputRef: (projectId: number, el: HTMLInputElement | null) => void
  beginProjectNameEdit: (project: Project) => void
  cancelProjectNameEdit: (projectId: number) => void
  commitProjectNameEdit: (project: Project) => Promise<void>
  beginProjectCustomerEdit: (project: Project) => void
  cancelProjectCustomerEdit: (projectId: number) => void
  commitProjectCustomerEdit: (project: Project) => Promise<void>
  projectMenuOpen: number | null
  setProjectMenuOpen: (projectId: number | null) => void
  setProjectCardRef: (projectId: number, el: HTMLDivElement | null) => void
  onProjectArchiveToggle: (project: Project) => void
  onProjectDelete: (project: Project) => void
  onProjectSelect: (project: Project | null) => void
  onProjectReorder: (
    sourceProjectId: number,
    targetProjectId: number,
    position?: 'before' | 'after',
  ) => void
  onLoadMoreProjects: () => Promise<void> | void
  onEnsureProjectSessionsLoaded: (projectId: number) => Promise<void> | void
  onLoadMoreProjectSessions: (projectId: number) => Promise<void> | void
  onEnsureChildProjectsLoaded: (parentId: number) => Promise<void> | void
  onLoadMoreChildProjects: (parentId: number) => Promise<void> | void
  renderSessionItem: (session: Session, variant: 'standalone' | 'project') => ReactNode
  makePillStyle: (active: boolean) => CSSProperties
}

export const ProjectTabContent: FC<ProjectTabContentProps> = ({
  projectStatusFilter,
  onProjectStatusFilterChange,
  dragEnabled,
  projects,
  projectListPagination,
  projectsBaselineCount,
  projectSessions,
  projectSessionPaginationByProject,
  childProjectsByParent,
  childProjectPaginationByParent,
  selectedProjectId,
  manualExpandedProjects,
  getDefaultProjectExpanded,
  toggleProjectExpanded,
  editingProjectNameId,
  editingProjectCustomerId,
  projectNameDrafts,
  projectCustomerDrafts,
  setProjectNameDraft,
  setProjectCustomerDraft,
  setProjectNameInputRef,
  setProjectCustomerInputRef,
  beginProjectNameEdit,
  cancelProjectNameEdit,
  commitProjectNameEdit,
  beginProjectCustomerEdit,
  cancelProjectCustomerEdit,
  commitProjectCustomerEdit,
  projectMenuOpen,
  setProjectMenuOpen,
  setProjectCardRef,
  onProjectArchiveToggle,
  onProjectDelete,
  onProjectSelect,
  onProjectReorder,
  onLoadMoreProjects,
  onEnsureProjectSessionsLoaded,
  onLoadMoreProjectSessions,
  onEnsureChildProjectsLoaded,
  onLoadMoreChildProjects,
  renderSessionItem,
  makePillStyle,
}) => {
  type DropPosition = 'before' | 'after'

  const [draggingProjectId, setDraggingProjectId] = useState<number | null>(null)
  const [dropTargetProjectId, setDropTargetProjectId] = useState<number | null>(null)
  const [dropTargetPosition, setDropTargetPosition] = useState<DropPosition>('before')
  const draggingProjectIdRef = useRef<number | null>(null)
  const projectWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const resetDragState = useCallback(() => {
    draggingProjectIdRef.current = null
    setDraggingProjectId(null)
    setDropTargetProjectId(null)
    setDropTargetPosition('before')
  }, [])

  const setProjectWrapperRef = useCallback((projectId: number, el: HTMLDivElement | null) => {
    if (el) {
      projectWrapperRefs.current[projectId] = el
      return
    }
    delete projectWrapperRefs.current[projectId]
  }, [])

  const resolveDraggedProjectId = useCallback(
    (event: DragEvent<HTMLElement>): number | null => {
      const customRawId = event.dataTransfer.getData('application/x-project-id').trim()
      const plainRawId = event.dataTransfer.getData('text/plain').trim()
      const rawId = customRawId || plainRawId
      if (!rawId) {
        return draggingProjectIdRef.current ?? draggingProjectId
      }
      const parsedId = Number(rawId)
      return Number.isInteger(parsedId) && parsedId > 0
        ? parsedId
        : (draggingProjectIdRef.current ?? draggingProjectId)
    },
    [draggingProjectId],
  )

  const handleProjectDrop = useCallback(
    (sourceProjectId: number | null, targetProjectId: number, position: DropPosition) => {
      if (!dragEnabled || sourceProjectId == null) {
        resetDragState()
        return
      }
      if (sourceProjectId !== targetProjectId || position === 'after') {
        onProjectReorder(sourceProjectId, targetProjectId, position)
      }
      resetDragState()
    },
    [dragEnabled, onProjectReorder, resetDragState],
  )

  const resolveDropPlacementByY = useCallback(
    (clientY: number): { targetProjectId: number; position: DropPosition } | null => {
      if (projects.length === 0) {
        return null
      }

      const wrappers = projects
        .map((project) => ({
          projectId: project.id,
          el: projectWrapperRefs.current[project.id] ?? null,
        }))
        .filter((item): item is { projectId: number; el: HTMLDivElement } => item.el !== null)

      if (wrappers.length === 0) {
        return null
      }

      for (let index = 0; index < wrappers.length; index += 1) {
        const wrapper = wrappers[index]
        const rect = wrapper.el.getBoundingClientRect()
        const middle = rect.top + rect.height / 2

        if (clientY < middle) {
          return { targetProjectId: wrapper.projectId, position: 'before' }
        }

        if (clientY >= middle && clientY <= rect.bottom) {
          return { targetProjectId: wrapper.projectId, position: 'after' }
        }
      }

      const last = wrappers[wrappers.length - 1]
      return {
        targetProjectId: last.projectId,
        position: 'after',
      }
    },
    [projects],
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['active', 'archived'] as const).map((status) => (
          <button
            key={status}
            type="button"
            className="pill-btn chat-action-btn flex-1"
            style={makePillStyle(projectStatusFilter === status)}
            onClick={() => onProjectStatusFilterChange(status)}
            aria-pressed={projectStatusFilter === status}
          >
            {status === 'active' ? '进行中' : '已归档'}
          </button>
        ))}
      </div>
      {projects.length === 0 ? (
        projectsBaselineCount === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📁</div>
            <div className="text-sm">
              {projectStatusFilter === 'archived' ? '暂无归档项目' : '还没有项目'}
            </div>
            {projectStatusFilter === 'active' && (
              <div className="text-xs mt-1 text-gray-500">
                使用&quot;快速创建项目&quot;后即可在此查看与管理
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <div className="text-sm">未找到匹配的项目</div>
            <div className="text-xs mt-1 text-gray-500">可以尝试调整搜索或筛选条件</div>
          </div>
        )
      ) : (
        <>
          {!dragEnabled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              当前仅支持在完整项目列表下拖拽排序。请清空搜索并确保列表已完整加载。
            </div>
          )}
          <div
            className="space-y-3"
            onDragOver={(event) => {
              if (!dragEnabled) {
                return
              }
              const sourceProjectId = resolveDraggedProjectId(event)
              if (sourceProjectId == null) {
                return
              }
              const placement = resolveDropPlacementByY(event.clientY)
              if (!placement) {
                return
              }
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setDropTargetProjectId(placement.targetProjectId)
              setDropTargetPosition(placement.position)
            }}
            onDrop={(event) => {
              if (!dragEnabled) {
                return
              }
              const sourceProjectId = resolveDraggedProjectId(event)
              const placement = resolveDropPlacementByY(event.clientY)
              event.preventDefault()
              if (!placement) {
                resetDragState()
                return
              }
              handleProjectDrop(sourceProjectId, placement.targetProjectId, placement.position)
            }}
            onDragLeave={(event) => {
              const relatedTarget = event.relatedTarget
              if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
                return
              }
              setDropTargetProjectId(null)
            }}
          >
            {projects.map((project) => {
              const sessionsForProject = projectSessions[project.id] ?? []
              const hasManualState = Object.prototype.hasOwnProperty.call(
                manualExpandedProjects,
                project.id,
              )
              const isExpanded = hasManualState
                ? manualExpandedProjects[project.id]
                : getDefaultProjectExpanded(project.id)
              const isActive = selectedProjectId === project.id

              return (
                <div
                  key={project.id}
                  ref={(el) => setProjectWrapperRef(project.id, el)}
                  className={`relative rounded-xl transition-shadow ${
                    dropTargetProjectId === project.id && draggingProjectId !== project.id
                      ? 'ring-2 ring-emerald-300 shadow-md'
                      : ''
                  }`}
                  onDragOver={(event) => {
                    if (!dragEnabled) {
                      return
                    }
                    const sourceProjectId = resolveDraggedProjectId(event)
                    if (sourceProjectId == null) {
                      return
                    }
                    const rect = event.currentTarget.getBoundingClientRect()
                    const position: DropPosition =
                      event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before'
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setDropTargetProjectId(project.id)
                    setDropTargetPosition(position)
                  }}
                  onDrop={(event) => {
                    if (!dragEnabled) {
                      return
                    }
                    const sourceProjectId = resolveDraggedProjectId(event)
                    const rect = event.currentTarget.getBoundingClientRect()
                    const position: DropPosition =
                      event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before'
                    event.preventDefault()
                    event.stopPropagation()
                    handleProjectDrop(sourceProjectId, project.id, position)
                  }}
                >
                  {dropTargetProjectId === project.id && draggingProjectId !== project.id && (
                    <div
                      className={`pointer-events-none absolute left-4 right-4 z-20 h-0.5 bg-emerald-400 ${
                        dropTargetPosition === 'before' ? 'top-0' : 'bottom-0'
                      }`}
                    />
                  )}
                  <ProjectCard
                    project={project}
                    sessionsForProject={sessionsForProject}
                    sessionPagination={projectSessionPaginationByProject[project.id]}
                    childProjects={childProjectsByParent[project.id]}
                    childProjectPagination={childProjectPaginationByParent[project.id]}
                    isExpanded={isExpanded}
                    isActive={isActive}
                    projectMenuOpen={projectMenuOpen}
                    onSetProjectMenuOpen={setProjectMenuOpen}
                    projectCardRef={(el) => setProjectCardRef(project.id, el)}
                    editingProjectNameId={editingProjectNameId}
                    editingProjectCustomerId={editingProjectCustomerId}
                    projectNameDraft={projectNameDrafts[project.id] ?? project.name}
                    projectCustomerDraft={projectCustomerDrafts[project.id] ?? ''}
                    onSetProjectNameDraft={(value) => setProjectNameDraft(project.id, value)}
                    onSetProjectCustomerDraft={(value) =>
                      setProjectCustomerDraft(project.id, value)
                    }
                    onSetProjectNameInputRef={(el) => setProjectNameInputRef(project.id, el)}
                    onSetProjectCustomerInputRef={(el) =>
                      setProjectCustomerInputRef(project.id, el)
                    }
                    onBeginProjectNameEdit={beginProjectNameEdit}
                    onCancelProjectNameEdit={cancelProjectNameEdit}
                    onCommitProjectNameEdit={commitProjectNameEdit}
                    onBeginProjectCustomerEdit={beginProjectCustomerEdit}
                    onCancelProjectCustomerEdit={cancelProjectCustomerEdit}
                    onCommitProjectCustomerEdit={commitProjectCustomerEdit}
                    onProjectSelect={onProjectSelect}
                    onProjectArchiveToggle={onProjectArchiveToggle}
                    onProjectDelete={onProjectDelete}
                    onToggleProjectExpanded={(projectId) => {
                      const willExpand = !isExpanded
                      toggleProjectExpanded(projectId)
                      if (willExpand) {
                        void onEnsureProjectSessionsLoaded(projectId)
                        if (project.hasChildren || (project.childCount ?? 0) > 0) {
                          void onEnsureChildProjectsLoaded(projectId)
                        }
                      }
                    }}
                    onEnsureSessionsLoaded={onEnsureProjectSessionsLoaded}
                    onLoadMoreSessions={onLoadMoreProjectSessions}
                    onEnsureChildProjectsLoaded={onEnsureChildProjectsLoaded}
                    onLoadMoreChildProjects={onLoadMoreChildProjects}
                    renderSessionItem={renderSessionItem}
                    dragEnabled={dragEnabled}
                    isDragging={draggingProjectId === project.id}
                    onDragHandleStart={() => {
                      if (!dragEnabled) {
                        return
                      }
                      draggingProjectIdRef.current = project.id
                      setDraggingProjectId(project.id)
                      setDropTargetProjectId(project.id)
                      setDropTargetPosition('before')
                    }}
                    onDragHandleEnd={resetDragState}
                  />
                </div>
              )
            })}
          </div>
          {(projectListPagination.hasMore || projectListPagination.isLoading) && (
            <button
              type="button"
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-gray-500 disabled:border-gray-200 disabled:bg-gray-50"
              disabled={projectListPagination.isLoading || !projectListPagination.hasMore}
              onClick={() => {
                void onLoadMoreProjects()
              }}
            >
              {projectListPagination.isLoading
                ? '正在加载…'
                : `加载更多项目 (${projectListPagination.loadedCount}/${projectListPagination.total})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
