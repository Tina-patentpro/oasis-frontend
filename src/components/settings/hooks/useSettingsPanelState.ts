import { useCallback, useEffect, useRef, useState } from 'react'

import { billingService, userService } from '@/api/services'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUIStore } from '@/stores/useUIStore'
import type { RechargePackage } from '@/types/api'
import {
  buildAugmentedUserDataExportPackage,
  downloadBlobAsFile,
  type UserDataExportProgress,
} from '@/utils/user-data-export'
import { SETTINGS_MENU, type SettingsPage } from '../constants'
import { useProfileReferralState } from './settings-panel/useProfileReferralState'
import type { UseSettingsPanelStateResult } from './settings-panel/types'

function parseRunningWaterTime(value: string): number {
  const parsed = Date.parse(value)
  if (Number.isFinite(parsed)) {
    return parsed
  }
  const normalized = value.replace(/-/g, '/')
  const reparsed = Date.parse(normalized)
  return Number.isFinite(reparsed) ? reparsed : -1
}

function pickLatestBalance(
  items: Array<{ balance?: unknown; create_time?: unknown }>,
): number | null {
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  let latestBalance: number | null = null
  let latestTimestamp = -1

  for (const item of items) {
    const balanceValue = item?.balance
    if (typeof balanceValue !== 'number' || !Number.isFinite(balanceValue)) {
      continue
    }

    const createTimeValue = item?.create_time
    const timestamp =
      typeof createTimeValue === 'string' && createTimeValue.trim() !== ''
        ? parseRunningWaterTime(createTimeValue)
        : -1

    if (latestBalance === null || timestamp > latestTimestamp) {
      latestBalance = balanceValue
      latestTimestamp = timestamp
    }
  }

  return latestBalance
}

export function useSettingsPanelState(
  initialPage: SettingsPage = 'profile',
): UseSettingsPanelStateResult {
  const user = useAuthStore((state) => state.user)
  const showToast = useUIStore((state) => state.showToast)
  const [currentPage, setCurrentPage] = useState<SettingsPage>(initialPage)
  useEffect(() => {
    setCurrentPage(initialPage)
  }, [initialPage])

  const [userBalance, setUserBalance] = useState<number>(user?.balance ?? 0)
  const [customRechargeAmount, setCustomRechargeAmount] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profileState = useProfileReferralState({ user })

  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [hasConfirmedDelete, setHasConfirmedDelete] = useState(false)
  const [isExportingAllData, setIsExportingAllData] = useState(false)
  const [exportAllDataProgressText, setExportAllDataProgressText] = useState<string | null>(null)

  const [rechargePackages, setRechargePackages] = useState<RechargePackage[]>([])
  const [packagesError, setPackagesError] = useState<string | null>(null)
  const [isLoadingPackages, setIsLoadingPackages] = useState(false)

  useEffect(() => {
    if (typeof user?.balance === 'number') {
      setUserBalance(user.balance)
    }
  }, [user?.balance])

  useEffect(() => {
    const shouldSyncBalance = currentPage === 'balance' || currentPage === 'runningWater'
    if (!shouldSyncBalance) {
      return
    }

    let cancelled = false

    const syncLatestBalance = async () => {
      try {
        const latestUser = await userService.getCurrentUser()
        if (!cancelled && typeof latestUser.balance === 'number') {
          setUserBalance(latestUser.balance)
        }
      } catch (error) {
        console.warn('[settings] 同步用户余额失败，将尝试使用流水余额兜底', error)
      }

      try {
        const runningWater = await billingService.getRunningWaterList({
          page: 1,
          limit: 20,
        })
        if (cancelled) {
          return
        }
        const latestBalance = pickLatestBalance(runningWater.items)
        if (latestBalance !== null) {
          setUserBalance(latestBalance)
        }
      } catch (error) {
        console.warn('[settings] 获取最新余额失败', error)
      }
    }

    void syncLatestBalance()

    return () => {
      cancelled = true
    }
  }, [currentPage])

  useEffect(() => {
    let cancelled = false

    const loadPackages = async () => {
      setIsLoadingPackages(true)
      setPackagesError(null)
      try {
        const data = await billingService.getRechargePackages()
        if (!cancelled) {
          setRechargePackages(data)
        }
      } catch (error) {
        console.warn('[settings] 获取充值套餐失败', error)
        if (!cancelled) {
          setRechargePackages([])
          setPackagesError('获取充值套餐失败，请稍后重试')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPackages(false)
        }
      }
    }

    void loadPackages()

    return () => {
      cancelled = true
    }
  }, [])

  const handleCustomAmountChange = useCallback((value: string) => {
    if (value && !/^[0-9.]*$/.test(value)) return
    if (value.includes('.')) {
      const [integerPart, decimalPart] = value.split('.')
      if ((integerPart && integerPart.length > 3) || (decimalPart && decimalPart.length > 2)) return
    } else if (value.length > 3) {
      return
    }
    const numValue = parseFloat(value)
    if (value && (Number.isNaN(numValue) || numValue <= 0)) return
    setCustomRechargeAmount(value)
  }, [])

  const openWorkflowDialog = useCallback(() => {
    setIsWorkflowDialogOpen(true)
  }, [])

  const closeWorkflowDialog = useCallback(() => {
    setIsWorkflowDialogOpen(false)
  }, [])

  const handleExportAllData = useCallback(async () => {
    setIsExportingAllData(true)
    setExportAllDataProgressText('正在准备基础数据包…')
    try {
      // 1. Check stats first
      const stats = await userService.getUserDataStats()
      if (stats.total_count === 0) {
        showToast('暂无数据可导出')
        return
      }

      const exportResult = await buildAugmentedUserDataExportPackage({
        baseZipBlob: await userService.exportUserData(),
        filename: `user_data_${new Date().getTime()}.zip`,
        onProgress: (progress: UserDataExportProgress) => {
          setExportAllDataProgressText(progress.message)
        },
      })

      setExportAllDataProgressText('正在触发浏览器下载…')
      downloadBlobAsFile(exportResult.blob, exportResult.filename)

      const missingAttachmentCount =
        exportResult.attachmentSummary.failedCount +
        exportResult.attachmentSummary.skippedRecordCount
      const attachmentReportSuffix = exportResult.attachmentSummary.reportPath
        ? `，详情见压缩包内的 ${exportResult.attachmentSummary.reportPath}`
        : ''

      if (exportResult.attachmentSummary.addedCount > 0 && missingAttachmentCount > 0) {
        showToast(
          `成功导出 ${stats.total_count} 条记录，并补充 ${exportResult.attachmentSummary.addedCount} 个生成附件；另有 ${missingAttachmentCount} 项附件未能打包${attachmentReportSuffix}`,
        )
        return
      }

      if (exportResult.attachmentSummary.addedCount > 0) {
        showToast(
          `成功导出 ${stats.total_count} 条记录，并补充 ${exportResult.attachmentSummary.addedCount} 个生成附件`,
        )
        return
      }

      if (missingAttachmentCount > 0) {
        showToast(
          `成功导出 ${stats.total_count} 条记录，但有 ${missingAttachmentCount} 项附件未能补齐${attachmentReportSuffix}`,
        )
        return
      }

      showToast(`成功导出 ${stats.total_count} 条记录`)
    } catch (error) {
      console.error('[settings] 导出所有数据失败', error)
      showToast('导出失败，请稍后重试')
    } finally {
      setIsExportingAllData(false)
      setExportAllDataProgressText(null)
    }
  }, [showToast])

  const openDeleteConfirm = useCallback(() => {
    setHasConfirmedDelete(false)
    setIsDeleteConfirmOpen(true)
  }, [])

  const handleConfirmDeleteAll = useCallback(async () => {
    setIsDeleteConfirmOpen(false)
    setHasConfirmedDelete(false)

    try {
      const { userService } = await import('@/api/services')
      const result = await userService.clearUserData()
      showToast(`已清空 ${result.total_count} 条记录`)
      // Optionally refresh data if needed, e.g. userBalance or other states
    } catch (error) {
      console.error('[settings] 清空数据失败', error)
      showToast('清空失败，请稍后重试')
    }
  }, [showToast])

  const deleteConfirm = {
    isOpen: isDeleteConfirmOpen,
    hasConfirmed: hasConfirmedDelete,
    acknowledgeRisk: () => setHasConfirmedDelete(true),
    close: () => {
      setHasConfirmedDelete(false)
      setIsDeleteConfirmOpen(false)
    },
    confirm: handleConfirmDeleteAll,
  }

  return {
    currentPage,
    setCurrentPage,
    userBalance,
    customRechargeAmount,
    handleCustomAmountChange,
    profile: {
      avatarUrl: profileState.avatarUrl,
      fileInputRef,
      handleAvatarChange: profileState.handleAvatarChange,
      myReferralCode: profileState.myReferralCode,
      handleCopyReferralCode: profileState.handleCopyReferralCode,
      isGeneratingReferralCode: profileState.isGeneratingReferralCode,
      handleGenerateReferralCode: profileState.handleGenerateReferralCode,
      referralRecords: profileState.referralRecords,
      isReferralLoading: profileState.isReferralLoading,
      referralError: profileState.referralError,
      retryReferralLoad: profileState.retryReferralLoad,
    },
    billing: {
      packages: rechargePackages,
      packagesError,
      isLoadingPackages,
    },
    isExportingAllData,
    exportAllDataProgressText,
    dataManagementActions: {
      openExportWorkflowDialog: openWorkflowDialog,
      openClearConfirm: openDeleteConfirm,
      openDeleteConfirm,
      handleExportAllData,
    },
    workflowDialog: {
      isOpen: isWorkflowDialogOpen,
      close: closeWorkflowDialog,
    },
    deleteConfirm,
    menu: SETTINGS_MENU,
  }
}
