import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import { SettingsPanel } from './SettingsPanel'
import { useSettingsPanelState } from './settings/hooks/useSettingsPanelState'

jest.mock('@/components/ui/motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    button: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      whileHover?: unknown
      whileTap?: unknown
    }) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

jest.mock('./settings/hooks/useSettingsPanelState', () => ({
  useSettingsPanelState: jest.fn(),
}))

jest.mock('./settings/loadWorkflowExportItems', () => ({
  loadWorkflowExportItems: jest.fn(),
}))

jest.mock('./DownloadFilesDialog', () => ({
  DownloadFilesDialog: () => null,
}))

const mockUseSettingsPanelState = useSettingsPanelState as jest.MockedFunction<
  typeof useSettingsPanelState
>

function mockSettingsPanelState({
  currentPage = 'data',
  setCurrentPage = jest.fn(),
  deleteConfirmOpen = false,
  deleteRiskConfirmed = false,
}: {
  currentPage?: 'profile' | 'balance' | 'runningWater' | 'modelPreferences' | 'data'
  setCurrentPage?: jest.Mock
  deleteConfirmOpen?: boolean
  deleteRiskConfirmed?: boolean
} = {}) {
  mockUseSettingsPanelState.mockReturnValue({
    currentPage,
    setCurrentPage,
    userBalance: 0,
    customRechargeAmount: '',
    handleCustomAmountChange: jest.fn(),
    profile: {
      avatarUrl: '',
      fileInputRef: React.createRef<HTMLInputElement>(),
      handleAvatarChange: jest.fn(),
      myReferralCode: null,
      handleCopyReferralCode: jest.fn(async () => undefined),
      isGeneratingReferralCode: false,
      handleGenerateReferralCode: jest.fn(async () => undefined),
      referralRecords: [],
      isReferralLoading: false,
      referralError: null,
      retryReferralLoad: jest.fn(),
    },
    billing: {
      packages: [],
      packagesError: null,
      isLoadingPackages: false,
    },
    isExportingAllData: false,
    exportAllDataProgressText: null,
    dataManagementActions: {
      openExportWorkflowDialog: jest.fn(),
      openClearConfirm: jest.fn(),
      openDeleteConfirm: jest.fn(),
      handleExportAllData: jest.fn(async () => undefined),
    },
    workflowDialog: {
      isOpen: false,
      close: jest.fn(),
    },
    deleteConfirm: {
      isOpen: deleteConfirmOpen,
      hasConfirmed: deleteRiskConfirmed,
      acknowledgeRisk: jest.fn(),
      close: jest.fn(),
      confirm: jest.fn(),
    },
    menu: [
      { key: 'profile', label: '个人信息和推荐奖励', icon: '👤' },
      { key: 'balance', label: '充值/余额', icon: '💰' },
      { key: 'runningWater', label: '流水记录', icon: '💸' },
      { key: 'modelPreferences', label: '模型喜好设定', icon: '🧭' },
      { key: 'data', label: '数据管理', icon: '💾' },
    ],
  })
}

describe('SettingsPanel behavior', () => {
  test('describes why the final delete action is disabled before risk acknowledgement', async () => {
    mockSettingsPanelState({
      deleteConfirmOpen: true,
    })

    render(<SettingsPanel isOpen onClose={jest.fn()} initialPage="data" themeColor="#10b981" />)

    expect(await screen.findByRole('button', { name: '确认删除' })).toHaveAccessibleDescription(
      /为避免误操作，请先点击下方确认按钮/,
    )
  })

  test('shows settings navigation and lets users switch sections inside the panel', async () => {
    const setCurrentPage = jest.fn()
    mockSettingsPanelState({
      currentPage: 'data',
      setCurrentPage,
    })

    render(<SettingsPanel isOpen onClose={jest.fn()} initialPage="data" themeColor="#10b981" />)

    expect(await screen.findByRole('heading', { name: '设置' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /数据管理/ }))

    expect(setCurrentPage).toHaveBeenCalledWith('data')
  })
})
