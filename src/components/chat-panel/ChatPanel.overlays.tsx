import { lazy, Suspense } from 'react'

import type { Project } from '@/types/api'

import { ComponentErrorBoundary } from '../error-boundaries'
import { ConfirmDialog } from '../ui/feedback/ConfirmDialog'

const AssociateProjectDialog = lazy(() =>
  import('../AssociateProjectDialog').then((module) => ({
    default: module.AssociateProjectDialog,
  })),
)

interface ChatPanelOverlaysProps {
  associateProjectDialogOpen: boolean
  onCloseAssociateProjectDialog: () => void
  onCreateNewProject: () => void
  onSelectProject: (project: Project) => void
  sessionName: string
  projects: Project[]
  themeColor: string
  clearConfirmOpen: boolean
  onCancelClear: () => void
  onConfirmClear: () => void
  newConversationConfirmOpen: boolean
  onCancelNewConversation: () => void
  onConfirmNewConversation: () => void
}

export const ChatPanelOverlays = ({
  associateProjectDialogOpen,
  onCloseAssociateProjectDialog,
  onCreateNewProject,
  onSelectProject,
  sessionName,
  projects,
  themeColor,
  clearConfirmOpen,
  onCancelClear,
  onConfirmClear,
  newConversationConfirmOpen,
  onCancelNewConversation,
  onConfirmNewConversation,
}: ChatPanelOverlaysProps) => (
  <>
    <ComponentErrorBoundary componentName="AssociateProjectDialog">
      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            className="fixed inset-x-0 bottom-6 z-[100] flex justify-center"
          >
            <span className="rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
              正在加载项目选择界面…
            </span>
          </div>
        }
      >
        {associateProjectDialogOpen ? (
          <AssociateProjectDialog
            isOpen={associateProjectDialogOpen}
            onClose={onCloseAssociateProjectDialog}
            onCreateNewProject={onCreateNewProject}
            onSelectProject={onSelectProject}
            sessionName={sessionName}
            projects={projects}
            backgroundColor={themeColor}
          />
        ) : null}
      </Suspense>
    </ComponentErrorBoundary>
    <ConfirmDialog
      isOpen={clearConfirmOpen}
      title="确认清空对话？"
      message="此操作不可撤销，所有消息将被永久删除。"
      cancelText="取消"
      confirmText="确认清空"
      danger
      onCancel={onCancelClear}
      onConfirm={onConfirmClear}
    />
    <ConfirmDialog
      isOpen={newConversationConfirmOpen}
      title="开始新对话？"
      message="当前输入框中有未发送的内容，确定要开始新对话吗？"
      cancelText="取消"
      confirmText="确定"
      onCancel={onCancelNewConversation}
      onConfirm={onConfirmNewConversation}
    />
  </>
)
