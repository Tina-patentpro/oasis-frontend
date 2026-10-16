import { useEffect, useLayoutEffect, lazy, Suspense, type ReactElement } from 'react'

import { useLayout } from '@/app/providers/LayoutProvider'
import { ConfirmDialog } from '@/components/ui'
import { NavigationBar } from '@/components/workspace'
import { PageErrorBoundary } from '@/components/error-boundaries'
import { AsyncTaskDaemon } from '@/components/workspace/AsyncTaskDaemon'

import { LazyDialogBoundary } from './components/LazyDialogBoundary'
import { WorkspaceMainLayout } from './components/WorkspaceMainLayout'
import { WorkspaceRightPanel } from './components/WorkspaceRightPanel'
import { useWorkspaceDialogs } from './hooks/useWorkspaceDialogs'
import { useWorkspaceLayout } from './hooks/useWorkspaceLayout'
import { useWorkspaceShortcuts } from './hooks/useWorkspaceShortcuts'

const SettingsPanel = lazy(() =>
  import('@/components/SettingsPanel').then((m) => ({ default: m.SettingsPanel })),
)
const ReleaseNotesDialog = lazy(() =>
  import('@/components/ReleaseNotesDialog').then((m) => ({ default: m.ReleaseNotesDialog })),
)
const HelpDocumentation = lazy(() =>
  import('@/components/HelpDocumentation').then((m) => ({ default: m.HelpDocumentation })),
)
const CustomerServiceDialog = lazy(() =>
  import('@/components/CustomerServiceDialog').then((m) => ({ default: m.CustomerServiceDialog })),
)
const HistoryDataDialog = lazy(() =>
  import('@/components/HistoryDataDialog').then((m) => ({ default: m.HistoryDataDialog })),
)
const LocalHistoryFilesDialog = lazy(() =>
  import('@/components/LocalHistoryFilesDialog').then((m) => ({
    default: m.LocalHistoryFilesDialog,
  })),
)
const QuickCreateProjectDialog = lazy(() =>
  import('@/components/QuickCreateProjectDialog').then((m) => ({
    default: m.QuickCreateProjectDialog,
  })),
)
const DownloadFilesDialog = lazy(() =>
  import('@/components/DownloadFilesDialog').then((m) => ({ default: m.DownloadFilesDialog })),
)
const AssociateProjectDialog = lazy(() =>
  import('@/components/AssociateProjectDialog').then((m) => ({
    default: m.AssociateProjectDialog,
  })),
)
const RewardSuggestionDialog = lazy(() =>
  import('@/components/RewardSuggestionDialog').then((m) => ({
    default: m.RewardSuggestionDialog,
  })),
)

const lazyDialogFallback = (
  <div
    role="status"
    aria-live="polite"
    className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center"
  >
    <span className="rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
      正在加载界面…
    </span>
  </div>
)

function WorkspaceAppContent(): ReactElement {
  const { setHeaderVisibility, setContentClassName, resetBreadcrumbs } = useLayout()

  // Initialize workspace layout on mount
  useLayoutEffect(() => {
    setHeaderVisibility(false)
    setContentClassName('p-0')

    return () => {
      setHeaderVisibility(false)
      setContentClassName('px-6 py-6')
      resetBreadcrumbs()
    }
  }, [resetBreadcrumbs, setContentClassName, setHeaderVisibility])

  const dialogs = useWorkspaceDialogs()

  const layout = useWorkspaceLayout({
    notify: dialogs.notify,
    showConfirm: dialogs.showConfirm,
    hideConfirm: dialogs.hideConfirm,
    historyDialog: dialogs.history,
    downloadDialog: dialogs.downloadDialog,
    settingsDialog: dialogs.settings,
    releaseNotesDialog: dialogs.releaseNotes,
    helpDialog: dialogs.help,
    rewardSuggestionDialog: dialogs.rewardSuggestion,
    customerServiceDialog: dialogs.customerService,
    quickCreateProjectDialog: dialogs.quickCreateProject,
    localHistoryDialog: dialogs.localHistory,
  })

  useWorkspaceShortcuts({
    generate: layout.shortcuts.generate,
    copyInput: layout.shortcuts.copyInput,
    undoInputs: layout.shortcuts.undoInputs,
    setLayoutMode: layout.shortcuts.setLayoutMode,
  })
  const rootClasses = 'flex w-full flex-col bg-white text-gray-900 h-screen overflow-hidden'

  const contentWrapperClasses = 'flex bg-white flex-1 min-h-0 overflow-hidden'

  const showCenterContent =
    layout.chat.mode !== 'full' && !(layout.isCompact && layout.showSidebar)
  const renderMainLayout = showCenterContent || layout.showSidebar

  useEffect(() => {
    const handleOpenCustomerService = () => {
      dialogs.customerService.open()
    }
    window.addEventListener('openCustomerService', handleOpenCustomerService)
    return () => window.removeEventListener('openCustomerService', handleOpenCustomerService)
  }, [dialogs.customerService])

  return (
    <div className={rootClasses}>
      <AsyncTaskDaemon />
      <NavigationBar {...layout.navigationBarProps} />

      <div className={contentWrapperClasses}>
        {renderMainLayout && (
          <WorkspaceMainLayout
            layoutRef={layout.layoutRef}
            middleRef={layout.middleRef}
            appliedLayout={layout.appliedLayout}
            showSidebar={layout.showSidebar}
            showContent={showCenterContent}
            leftSidebarProps={layout.leftSidebarProps}
            inputSectionProps={layout.inputSectionProps}
            outputSectionProps={layout.outputSectionProps}
            workflowSteps={layout.workflowSteps}
            currentTheme={layout.currentTheme}
            isAsync={layout.isAsync}
          />
        )}
        <WorkspaceRightPanel
          chatOpen={layout.chat.isOpen}
          chatMode={layout.chat.mode}
          chatWidth={layout.chat.width}
          showSidebar={layout.showSidebar}
          onStartResize={layout.chat.startResize}
          onKeyboardResize={layout.chat.keyboardResize}
          chatPanelProps={layout.chat.panelProps}
        />
      </div>

      {dialogs.toast && (
        <div
          className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+11rem)] bottom-auto max-w-sm rounded-xl bg-gray-900 px-3 py-2 text-sm text-white shadow-lg toast-slide-in sm:inset-x-auto sm:top-auto sm:bottom-4 sm:right-4"
          role="alert"
        >
          {dialogs.toast}
        </div>
      )}

      <ConfirmDialog
        isOpen={dialogs.confirmDialog.isOpen}
        title={dialogs.confirmDialog.title}
        message={dialogs.confirmDialog.message}
        onConfirm={() => {
          dialogs.confirmDialog.onConfirm?.()
          dialogs.hideConfirm()
        }}
        onCancel={dialogs.hideConfirm}
      />

      <Suspense fallback={lazyDialogFallback}>
        {dialogs.settings.isOpen && (
          <LazyDialogBoundary dialogName="设置面板" chunkName="SettingsPanel">
            <SettingsPanel
              isOpen={dialogs.settings.isOpen}
              onClose={dialogs.settings.close}
              initialPage={dialogs.settingsPage}
              themeColor={layout.currentTheme.primary}
            />
          </LazyDialogBoundary>
        )}

        {dialogs.releaseNotes.isOpen && (
          <LazyDialogBoundary dialogName="版本更新弹窗" chunkName="ReleaseNotesDialog">
            <ReleaseNotesDialog
              isOpen={dialogs.releaseNotes.isOpen}
              onClose={dialogs.releaseNotes.close}
              themeColor={layout.currentTheme.primary}
            />
          </LazyDialogBoundary>
        )}

        {dialogs.help.isOpen && (
          <LazyDialogBoundary dialogName="帮助文档弹窗" chunkName="HelpDocumentation">
            <HelpDocumentation
              isOpen={dialogs.help.isOpen}
              onClose={dialogs.help.close}
              themeColor={layout.currentTheme.primary}
            />
          </LazyDialogBoundary>
        )}

        {dialogs.rewardSuggestion.isOpen && (
          <LazyDialogBoundary dialogName="打赏建议弹窗" chunkName="RewardSuggestionDialog">
            <RewardSuggestionDialog
              isOpen={dialogs.rewardSuggestion.isOpen}
              onClose={dialogs.rewardSuggestion.close}
              onSubmitted={() => dialogs.notify('建议提交成功，我们会尽快和你联系～')}
              themeColor={layout.currentTheme.primary}
            />
          </LazyDialogBoundary>
        )}

        {dialogs.customerService.isOpen && (
          <LazyDialogBoundary dialogName="客服弹窗" chunkName="CustomerServiceDialog">
            <CustomerServiceDialog
              isOpen={dialogs.customerService.isOpen}
              onClose={dialogs.customerService.close}
              themeColor={layout.currentTheme.primary}
            />
          </LazyDialogBoundary>
        )}

        {layout.historyDialog.isOpen && (
          <LazyDialogBoundary dialogName="历史数据弹窗" chunkName="HistoryDataDialog">
            <HistoryDataDialog
              isOpen={layout.historyDialog.isOpen}
              onClose={layout.historyDialog.close}
              onConfirm={layout.handleHistoryDataConfirm}
              themeColor={layout.currentTheme.primary}
              fixedProjectId={layout.historyDialog.options?.projectId}
              fixedType={layout.historyDialog.options?.type}
              titleOverride={layout.historyDialog.options?.title}
            />
          </LazyDialogBoundary>
        )}

        {layout.localHistoryDialog.isOpen && layout.localHistoryDialog.options?.sessions && (
          <LazyDialogBoundary dialogName="本地历史文件弹窗" chunkName="LocalHistoryFilesDialog">
            <LocalHistoryFilesDialog
              isOpen={layout.localHistoryDialog.isOpen}
              onClose={layout.localHistoryDialog.close}
              onConfirm={layout.handleHistoryDataConfirm}
              sessions={layout.localHistoryDialog.options.sessions}
              themeColor={layout.currentTheme.primary}
            />
          </LazyDialogBoundary>
        )}

        {dialogs.quickCreateProject.isOpen && (
          <LazyDialogBoundary dialogName="快速创建项目弹窗" chunkName="QuickCreateProjectDialog">
            <QuickCreateProjectDialog
              isOpen={dialogs.quickCreateProject.isOpen}
              onClose={dialogs.quickCreateProject.close}
              onConfirm={layout.handleQuickCreateProjectConfirm}
              themeColor={layout.currentTheme.primary}
            />
          </LazyDialogBoundary>
        )}

        {layout.downloadDialog.isOpen && (
          <LazyDialogBoundary dialogName="下载文件弹窗" chunkName="DownloadFilesDialog">
            <DownloadFilesDialog
              isOpen={layout.downloadDialog.isOpen}
              onClose={layout.downloadDialog.close}
              onDownload={(selectedFiles) => {
                dialogs.notify(`已开始处理 ${selectedFiles.size} 个下载项`)
              }}
              backgroundColor={layout.currentTheme.background}
              themeColor={layout.currentTheme.primary}
              exportType={
                (layout.downloadDialog.options?.exportType as
                  | 'session'
                  | 'project'
                  | 'history'
                  | 'files'
                  | 'workflow'
                  | 'instructions') ?? (layout.downloadableFiles.length > 0 ? 'files' : 'workflow')
              }
              data={{
                generatedFiles: layout.downloadableFiles,
                sessions: layout.sessions,
                workflows: layout.workflows,
              }}
            />
          </LazyDialogBoundary>
        )}

        {layout.associateProjectDialog.isOpen && (
          <LazyDialogBoundary dialogName="关联项目弹窗" chunkName="AssociateProjectDialog">
            <AssociateProjectDialog
              isOpen={layout.associateProjectDialog.isOpen}
              onClose={layout.associateProjectDialog.close}
              onCreateNewProject={layout.associateProjectDialog.onCreateNewProject}
              onSelectProject={layout.associateProjectDialog.onProjectSelect}
              sessionName={layout.associateProjectDialog.currentSessionTitle}
              mode={layout.associateProjectDialog.mode}
              excludeProjectId={layout.associateProjectDialog.excludeProjectId}
              isSubmitting={layout.associateProjectDialog.isSubmitting}
              projects={layout.projects.filter((project) => project.status === 'active')}
              backgroundColor={layout.currentTheme.background}
            />
          </LazyDialogBoundary>
        )}
      </Suspense>
    </div>
  )
}

export function WorkspaceApp(): ReactElement {
  return (
    <PageErrorBoundary>
      <WorkspaceAppContent />
    </PageErrorBoundary>
  )
}
