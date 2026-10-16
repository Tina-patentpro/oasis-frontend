import { useCallback, type FC, type ReactNode } from 'react'

import type { Session } from '@/types/api'

import { SearchInput, Tooltip } from '../../ui'
import { HistoryTabContent, ProjectTabContent } from './management/tabs'
import { useProjectManagementState } from './management/useProjectManagementState'
import type { ManagementSectionProps } from './types'

/**
 * Management section combining session history and project management tabs
 */
export const ManagementSection: FC<
  ManagementSectionProps & {
    renderSessionItem: (session: Session, variant: 'standalone' | 'project') => ReactNode
  }
> = ({
  managementTab,
  onManagementTabChange,
  searchTerm,
  onSearchTermChange,
  sessions,
  independentSessionPagination,
  hasIndependentSessionBaseline,
  projects,
  projectListPagination,
  projectSessions,
  projectSessionPaginationByProject,
  childProjectsByParent,
  childProjectPaginationByParent,
  selectedProjectId,
  projectStatusFilter,
  projectsBaselineCount,
  projectReorderEnabled,
  onProjectStatusFilterChange,
  onProjectUpdate,
  onProjectArchiveToggle,
  onProjectDelete,
  onProjectSelect,
  onProjectReorder,
  onLoadMoreProjects,
  onLoadMoreIndependentSessions,
  onEnsureProjectSessionsLoaded,
  onLoadMoreProjectSessions,
  onEnsureChildProjectsLoaded,
  onLoadMoreChildProjects,
  makePillStyle,
  renderSessionItem,
}) => {
  const {
    manualExpandedProjects,
    clearExpandedProjects,
    getDefaultProjectExpanded,
    toggleProjectExpanded,
    editingProjectNameId,
    editingProjectCustomerId,
    projectNameDrafts,
    projectCustomerDrafts,
    setProjectNameDrafts,
    setProjectCustomerDrafts,
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
    pendingRecoveryCount,
    retryNextRecovery,
  } = useProjectManagementState({
    onProjectUpdate,
  })
  const searchActive = searchTerm.trim().length > 0
  const historySearchActive = managementTab === 'history' && searchActive

  const handleSearchInputChange = useCallback(
    (value: string) => {
      onSearchTermChange(value)
      setProjectMenuOpen(null)
    },
    [onSearchTermChange, setProjectMenuOpen],
  )

  const handleProjectStatusFilterChange = useCallback(
    (value: 'active' | 'archived') => {
      onProjectStatusFilterChange(value)
      clearExpandedProjects()
      setProjectMenuOpen(null)
    },
    [clearExpandedProjects, onProjectStatusFilterChange, setProjectMenuOpen],
  )

  return (
    <div className="space-y-3">
      <SearchInput
        value={searchTerm}
        onChange={handleSearchInputChange}
        variant="workspace"
        placeholder="搜索项目或会话"
        aria-label="搜索项目或会话"
      />
      {pendingRecoveryCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center justify-between gap-2">
          <span>有 {pendingRecoveryCount} 个失败操作待重试</span>
          <button
            type="button"
            className="pill-btn chat-action-btn px-2 py-1 text-[11px]"
            style={makePillStyle(false)}
            onClick={() => {
              void retryNextRecovery()
            }}
          >
            重试下一项
          </button>
        </div>
      )}
      <div className="flex gap-2 w-full">
        <div className="flex-1">
          <Tooltip
            content="查看未关联项目的会话记录，便于后续归档或复用"
            position="bottom"
            align="start"
          >
            <button
              type="button"
              className="pill-btn chat-action-btn flex-1 w-full"
              style={makePillStyle(managementTab === 'history')}
              onClick={() => onManagementTabChange('history')}
            >
              独立会话历史
            </button>
          </Tooltip>
        </div>
        <div className="flex-1">
          <Tooltip content="进入项目中心，维护项目描述、历史记录与文件资产" position="bottom">
            <button
              type="button"
              className="pill-btn chat-action-btn flex-1 w-full"
              style={makePillStyle(managementTab === 'project')}
              onClick={() => onManagementTabChange('project')}
            >
              项目管理
            </button>
          </Tooltip>
        </div>
      </div>

      {managementTab === 'history' && (
        <HistoryTabContent
          sessions={sessions}
          searchActive={historySearchActive}
          independentSessionPagination={independentSessionPagination}
          hasIndependentSessionBaseline={hasIndependentSessionBaseline}
          onLoadMoreIndependentSessions={onLoadMoreIndependentSessions}
          renderSessionItem={renderSessionItem}
        />
      )}

      {managementTab === 'project' && (
        <ProjectTabContent
          projectStatusFilter={projectStatusFilter}
          onProjectStatusFilterChange={handleProjectStatusFilterChange}
          projects={projects}
          projectListPagination={projectListPagination}
          projectsBaselineCount={projectsBaselineCount}
          dragEnabled={projectReorderEnabled}
          projectSessions={projectSessions}
          projectSessionPaginationByProject={projectSessionPaginationByProject}
          childProjectsByParent={childProjectsByParent}
          childProjectPaginationByParent={childProjectPaginationByParent}
          selectedProjectId={selectedProjectId}
          manualExpandedProjects={manualExpandedProjects}
          getDefaultProjectExpanded={getDefaultProjectExpanded}
          toggleProjectExpanded={toggleProjectExpanded}
          editingProjectNameId={editingProjectNameId}
          editingProjectCustomerId={editingProjectCustomerId}
          projectNameDrafts={projectNameDrafts}
          projectCustomerDrafts={projectCustomerDrafts}
          setProjectNameDraft={(projectId, value) =>
            setProjectNameDrafts((prev) => ({ ...prev, [projectId]: value }))
          }
          setProjectCustomerDraft={(projectId, value) =>
            setProjectCustomerDrafts((prev) => ({ ...prev, [projectId]: value }))
          }
          setProjectNameInputRef={setProjectNameInputRef}
          setProjectCustomerInputRef={setProjectCustomerInputRef}
          beginProjectNameEdit={beginProjectNameEdit}
          cancelProjectNameEdit={cancelProjectNameEdit}
          commitProjectNameEdit={commitProjectNameEdit}
          beginProjectCustomerEdit={beginProjectCustomerEdit}
          cancelProjectCustomerEdit={cancelProjectCustomerEdit}
          commitProjectCustomerEdit={commitProjectCustomerEdit}
          projectMenuOpen={projectMenuOpen}
          setProjectMenuOpen={setProjectMenuOpen}
          setProjectCardRef={setProjectCardRef}
          onProjectArchiveToggle={onProjectArchiveToggle}
          onProjectDelete={onProjectDelete}
          onProjectSelect={onProjectSelect}
          onProjectReorder={onProjectReorder}
          onLoadMoreProjects={onLoadMoreProjects}
          onEnsureProjectSessionsLoaded={onEnsureProjectSessionsLoaded}
          onLoadMoreProjectSessions={onLoadMoreProjectSessions}
          onEnsureChildProjectsLoaded={onEnsureChildProjectsLoaded}
          onLoadMoreChildProjects={onLoadMoreChildProjects}
          renderSessionItem={renderSessionItem}
          makePillStyle={makePillStyle}
        />
      )}
    </div>
  )
}
