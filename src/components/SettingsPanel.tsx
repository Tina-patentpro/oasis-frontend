import { AnimatePresence, motion } from '@/components/ui/motion'
import React, { Suspense, lazy, useEffect, useState, type CSSProperties } from 'react'

import { tabContentVariants } from '../utils/animations'
import { isAbortLikeError } from '@/api/core/error-utils'
import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'

import { SettingsModal } from './settings/common/SettingsModal'
import type { SettingsPage } from './settings/constants'
import type { WorkflowListItem } from '@/types/api'
import { useSettingsPanelState } from './settings/hooks/useSettingsPanelState'
import { loadWorkflowExportItems } from './settings/loadWorkflowExportItems'
import { LoadingSpinner } from './ui/feedback/LoadingSpinner'
import { SettingsSidebar } from './settings/common/SettingsSidebar'

const BalanceSettingsSection = lazy(() =>
  import('./settings/sections/BalanceSettingsSection').then((m) => ({
    default: m.BalanceSettingsSection,
  })),
)
const DataManagementSection = lazy(() =>
  import('./settings/sections/DataManagementSection').then((m) => ({
    default: m.DataManagementSection,
  })),
)
const ModelPreferenceSection = lazy(() =>
  import('./settings/sections/ModelPreferenceSection').then((m) => ({
    default: m.ModelPreferenceSection,
  })),
)
const ProfileSettingsSection = lazy(() =>
  import('./settings/sections/ProfileSettingsSection').then((m) => ({
    default: m.ProfileSettingsSection,
  })),
)
const RunningWaterSection = lazy(() =>
  import('./settings/sections/RunningWaterSection').then((m) => ({
    default: m.RunningWaterSection,
  })),
)
const DownloadFilesDialog = lazy(() =>
  import('./DownloadFilesDialog').then((m) => ({ default: m.DownloadFilesDialog })),
)

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  initialPage: SettingsPage
  themeColor: string
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  initialPage,
  themeColor,
}) => {
  const {
    currentPage,
    setCurrentPage,
    userBalance,
    customRechargeAmount,
    handleCustomAmountChange,
    profile,
    billing,
    isExportingAllData,
    exportAllDataProgressText,
    dataManagementActions,
    workflowDialog,
    deleteConfirm,
    menu,
  } = useSettingsPanelState(initialPage)

  // 加载workflow列表
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([])
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false)

  useEffect(() => {
    if (!workflowDialog.isOpen) {
      setWorkflows([])
      setIsLoadingWorkflows(false)
      return
    }

    const controller = new AbortController()
    const loadWorkflows = async () => {
      setIsLoadingWorkflows(true)
      try {
        const loadedWorkflows = await loadWorkflowExportItems({
          signal: controller.signal,
        })
        if (controller.signal.aborted) {
          return
        }
        setWorkflows(loadedWorkflows)
      } catch (error) {
        if (controller.signal.aborted || isAbortLikeError(error)) {
          return
        }
        console.error('[settings] 加载workflow列表失败', error)
        setWorkflows([])
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingWorkflows(false)
        }
      }
    }

    void loadWorkflows()
    return () => {
      controller.abort()
    }
  }, [workflowDialog.isOpen])

  if (!isOpen) return null

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      label="设置面板"
      className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden sm:flex-row"
    >
      <SettingsSidebar
        menu={menu}
        currentPage={currentPage}
        onSelect={setCurrentPage}
        onClose={onClose}
        themeColor={themeColor}
      />

      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div />
          <button
            type="button"
            onClick={onClose}
            className="chat-action-btn h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ '--chat-btn-hover-translate': '0px' } as CSSProperties}
            aria-label="关闭设置面板"
          >
            ✕
          </button>
        </div>

        <AnimatePresence mode="wait">
          {currentPage === 'profile' && (
            <motion.div
              key="profile"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-8">
                    <LoadingSpinner size="md" className="text-gray-500" />
                  </div>
                }
              >
                <ProfileSettingsSection
                  themeColor={themeColor}
                  avatarUrl={profile.avatarUrl}
                  fileInputRef={profile.fileInputRef}
                  onAvatarChange={profile.handleAvatarChange}
                  myReferralCode={profile.myReferralCode}
                  onCopyReferralCode={profile.handleCopyReferralCode}
                  isGeneratingReferralCode={profile.isGeneratingReferralCode}
                  onGenerateReferralCode={profile.handleGenerateReferralCode}
                  referralRecords={profile.referralRecords}
                  isReferralLoading={profile.isReferralLoading}
                  referralError={profile.referralError}
                  onRetryReferral={profile.retryReferralLoad}
                />
              </Suspense>
            </motion.div>
          )}

          {currentPage === 'balance' && (
            <motion.div
              key="balance"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-8">
                    <LoadingSpinner size="md" className="text-gray-500" />
                  </div>
                }
              >
                <BalanceSettingsSection
                  themeColor={themeColor}
                  userBalance={userBalance}
                  customRechargeAmount={customRechargeAmount}
                  onCustomAmountChange={handleCustomAmountChange}
                  rechargePackages={billing.packages}
                  isLoadingPackages={billing.isLoadingPackages}
                  packagesError={billing.packagesError}
                />
              </Suspense>
            </motion.div>
          )}

          {currentPage === 'runningWater' && (
            <motion.div
              key="runningWater"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-8">
                    <LoadingSpinner size="md" className="text-gray-500" />
                  </div>
                }
              >
                <RunningWaterSection themeColor={themeColor} />
              </Suspense>
            </motion.div>
          )}

          {currentPage === 'modelPreferences' && (
            <motion.div
              key="modelPreferences"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-8">
                    <LoadingSpinner size="md" className="text-gray-500" />
                  </div>
                }
              >
                <ModelPreferenceSection themeColor={themeColor} />
              </Suspense>
            </motion.div>
          )}

          {currentPage === 'data' && (
            <motion.div
              key="data"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-8">
                    <LoadingSpinner size="md" className="text-gray-500" />
                  </div>
                }
              >
                <DataManagementSection
                  onExportDataClick={dataManagementActions.handleExportAllData}
                  onExportWorkflowClick={dataManagementActions.openExportWorkflowDialog}
                  onDeleteAllDataClick={dataManagementActions.openDeleteConfirm}
                  isExportingAllData={isExportingAllData}
                  exportAllDataProgressText={exportAllDataProgressText}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <SettingsModal
        isOpen={deleteConfirm.isOpen}
        onRequestClose={deleteConfirm.close}
        containerClassName="w-full max-w-sm"
        label="确认删除所有数据"
      >
        <h3 className="text-lg font-semibold text-red-600">确认删除所有数据？</h3>
        <p className="mt-2 text-sm text-gray-600">
          该操作不可恢复，将永久删除所有历史会话、文档与数据副本。请确认您已完成本地备份。
        </p>
        <div
          id="delete-confirm-risk-instruction"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
        >
          为避免误操作，请先点击下方确认按钮，确认后才能执行最终删除。
        </div>
        <button
          type="button"
          className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            deleteConfirm.hasConfirmed
              ? 'bg-emerald-500 text-white cursor-default'
              : 'border border-red-300 text-red-600 hover:bg-red-100'
          }`}
          onClick={deleteConfirm.acknowledgeRisk}
          disabled={deleteConfirm.hasConfirmed}
        >
          {deleteConfirm.hasConfirmed ? '已确认风险，可继续删除' : '我已阅读并理解上述风险'}
        </button>
        <div className="mt-6 flex justify-end gap-3 text-sm">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            onClick={deleteConfirm.close}
          >
            取消
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-white shadow transition-colors bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed disabled:hover:bg-red-300"
            onClick={deleteConfirm.confirm}
            disabled={!deleteConfirm.hasConfirmed}
            aria-describedby="delete-confirm-risk-instruction"
          >
            确认删除
          </button>
        </div>
      </SettingsModal>

      {/* Workflow导出对话框 */}
      <DownloadFilesDialog
        isOpen={workflowDialog.isOpen}
        onClose={workflowDialog.close}
        onDownload={() => {
          // 导出完成回调
        }}
        themeColor={themeColor}
        backgroundColor="#ffffff"
        exportType="workflow"
        isLoading={isLoadingWorkflows}
        data={{
          workflows: isLoadingWorkflows ? [] : workflows,
        }}
      />
    </AccessibleDialog>
  )
}

SettingsPanel.displayName = 'SettingsPanel'
