import type { ChangeEvent, RefObject } from 'react'

import type { RechargePackage } from '@/types/api'
import type { ReferralCode, ReferralRecord } from '../../../../types/common'
import type { SettingsPage } from '../../constants'

export interface UseSettingsPanelStateResult {
  currentPage: SettingsPage
  setCurrentPage: (page: SettingsPage) => void
  userBalance: number
  customRechargeAmount: string
  handleCustomAmountChange: (value: string) => void
  profile: {
    avatarUrl: string
    fileInputRef: RefObject<HTMLInputElement | null>
    handleAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void
    myReferralCode: ReferralCode | null
    handleCopyReferralCode: () => Promise<void>
    isGeneratingReferralCode: boolean
    handleGenerateReferralCode: () => Promise<void>
    referralRecords: ReferralRecord[]
    isReferralLoading: boolean
    referralError: string | null
    retryReferralLoad: () => void
  }
  billing: {
    packages: RechargePackage[]
    packagesError: string | null
    isLoadingPackages: boolean
  }
  isExportingAllData: boolean
  exportAllDataProgressText: string | null
  dataManagementActions: {
    openExportWorkflowDialog: () => void
    openClearConfirm: () => void
    openDeleteConfirm: () => void
    handleExportAllData: () => Promise<void>
  }
  workflowDialog: {
    isOpen: boolean
    close: () => void
  }
  deleteConfirm: {
    isOpen: boolean
    hasConfirmed: boolean
    acknowledgeRisk: () => void
    close: () => void
    confirm: () => void
  }
  menu: readonly {
    key: SettingsPage
    label: string
    icon: string
  }[]
}
