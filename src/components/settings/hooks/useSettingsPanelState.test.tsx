import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import type { RunningWaterListResponse, User, UserDataStats } from '@/types/api'
import type {
  AugmentedUserDataExportResult,
  UserDataExportProgress,
} from '@/utils/user-data-export'

import { useSettingsPanelState } from './useSettingsPanelState'

const mockGetRechargePackages = jest.fn<() => Promise<unknown[]>>()
const mockGetRunningWaterList =
  jest.fn<
    (params: {
      page: number
      limit: number
      type?: 'consumption' | 'topup' | 'give' | 'refund'
    }) => Promise<RunningWaterListResponse>
  >()
const mockGetCurrentUser = jest.fn<() => Promise<User>>()
const mockGetUserDataStats = jest.fn<() => Promise<UserDataStats>>()
const mockExportUserData = jest.fn<() => Promise<Blob>>()
const mockSetUser = jest.fn<(user: User | null) => void>()
const mockBuildAugmentedUserDataExportPackage =
  jest.fn<
    (params: {
      baseZipBlob: Blob
      filename: string
      historyPageSize?: number
      onProgress?: (progress: UserDataExportProgress) => void
    }) => Promise<AugmentedUserDataExportResult>
  >()
const mockDownloadBlobAsFile = jest.fn<(blob: Blob, filename: string) => void>()
const mockShowToast = jest.fn<(message: string) => void>()

let mockAuthState: {
  user: User | null
  setUser: (user: User | null) => void
}

jest.mock('@/api/services', () => ({
  billingService: {
    getRechargePackages: () => mockGetRechargePackages(),
    getRunningWaterList: (params: {
      page: number
      limit: number
      type?: 'consumption' | 'topup' | 'give' | 'refund'
    }) => mockGetRunningWaterList(params),
  },
  userService: {
    getCurrentUser: () => mockGetCurrentUser(),
    getUserDataStats: () => mockGetUserDataStats(),
    exportUserData: () => mockExportUserData(),
  },
}))

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
}))

jest.mock('@/stores/useUIStore', () => ({
  useUIStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}))

jest.mock('./settings-panel/useProfileReferralState', () => ({
  useProfileReferralState: (): {
    avatarUrl: string
    handleAvatarChange: () => void
    myReferralCode: string | null
    handleCopyReferralCode: () => Promise<void>
    referralRecords: unknown[]
    isReferralLoading: boolean
    referralError: string | null
    retryReferralLoad: () => void
  } => ({
    avatarUrl: '',
    handleAvatarChange: () => {},
    myReferralCode: null,
    handleCopyReferralCode: async () => {},
    referralRecords: [],
    isReferralLoading: false,
    referralError: null,
    retryReferralLoad: () => {},
  }),
}))

jest.mock('@/utils/user-data-export', () => ({
  buildAugmentedUserDataExportPackage: (params: {
    baseZipBlob: Blob
    filename: string
    historyPageSize?: number
    onProgress?: (progress: UserDataExportProgress) => void
  }) => mockBuildAugmentedUserDataExportPackage(params),
  downloadBlobAsFile: (blob: Blob, filename: string) => mockDownloadBlobAsFile(blob, filename),
}))

function Probe() {
  const state = useSettingsPanelState('balance')
  return <div data-testid="balance">{state.userBalance.toFixed(2)}</div>
}

function ExportProbe() {
  const state = useSettingsPanelState('data')
  return (
    <>
      <button type="button" onClick={() => void state.dataManagementActions.handleExportAllData()}>
        导出
      </button>
      <div data-testid="export-progress">{state.exportAllDataProgressText ?? ''}</div>
    </>
  )
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })
  return { promise, resolve }
}

describe('useSettingsPanelState balance sync', () => {
  beforeEach(() => {
    mockAuthState = {
      user: {
        id: 1,
        email: 'demo@example.com',
        username: 'demo',
        balance: 0,
        role: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      setUser: mockSetUser,
    }

    mockGetRechargePackages.mockResolvedValue([])
    mockGetCurrentUser.mockResolvedValue(mockAuthState.user as User)
    mockGetUserDataStats.mockResolvedValue({
      workflow_count: 0,
      chatflow_count: 0,
      folder_count: 0,
      total_count: 0,
    })
    mockExportUserData.mockResolvedValue(new Blob(['backend-zip'], { type: 'application/zip' }))
    mockBuildAugmentedUserDataExportPackage.mockResolvedValue({
      blob: new Blob(['final-zip'], { type: 'application/zip' }),
      filename: 'user_data_export.zip',
      attachmentSummary: {
        discoveredCount: 0,
        addedCount: 0,
        failedCount: 0,
        skippedRecordCount: 0,
      },
    })
    mockDownloadBlobAsFile.mockReset()
    mockShowToast.mockReset()
    mockGetRunningWaterList.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 101,
          uid: 1,
          title: '语义生图执行',
          link_id: 1,
          type: 'consumption',
          money: 3,
          balance: 855.85,
          pm: 0,
          create_time: '2026/03/01 05:02:27',
        },
      ],
    })
    mockSetUser.mockReset()
  })

  it('shows latest running-water balance on balance page when cached user balance is stale', async () => {
    render(<Probe />)

    await waitFor(() => {
      expect(screen.getByTestId('balance').textContent).toBe('855.85')
    })
  })

  it('shows partial export message when some generated files fail to be added', async () => {
    mockShowToast.mockClear()

    mockGetUserDataStats.mockResolvedValue({
      workflow_count: 2,
      chatflow_count: 1,
      folder_count: 0,
      total_count: 3,
    })
    mockBuildAugmentedUserDataExportPackage.mockResolvedValue({
      blob: new Blob(['final-zip'], { type: 'application/zip' }),
      filename: 'user_data_export.zip',
      attachmentSummary: {
        discoveredCount: 3,
        addedCount: 2,
        failedCount: 1,
        skippedRecordCount: 0,
        reportPath: '_metadata/generated-files-report.json',
      },
    })

    render(<ExportProbe />)
    fireEvent.click(screen.getByRole('button', { name: '导出' }))

    await waitFor(() => {
      expect(mockBuildAugmentedUserDataExportPackage).toHaveBeenCalled()
    })

    expect(mockDownloadBlobAsFile).toHaveBeenCalledWith(expect.any(Blob), 'user_data_export.zip')
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('成功导出 3 条记录，并补充 2 个生成附件'),
    )
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('1 项附件未能打包'))
  })

  it('does not mention a missing report path when attachment failures have no packaged report', async () => {
    mockShowToast.mockClear()

    mockGetUserDataStats.mockResolvedValue({
      workflow_count: 1,
      chatflow_count: 0,
      folder_count: 0,
      total_count: 1,
    })
    mockBuildAugmentedUserDataExportPackage.mockResolvedValue({
      blob: new Blob(['final-zip'], { type: 'application/zip' }),
      filename: 'user_data_export.zip',
      attachmentSummary: {
        discoveredCount: 1,
        addedCount: 0,
        failedCount: 1,
        skippedRecordCount: 0,
        reportPath: undefined,
      },
    })

    render(<ExportProbe />)
    fireEvent.click(screen.getByRole('button', { name: '导出' }))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalled()
    })

    expect(mockShowToast).toHaveBeenCalledWith('成功导出 1 条记录，但有 1 项附件未能补齐')
  })

  it('shows inline export progress text during full data export and clears it afterwards', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    const deferred = createDeferred<AugmentedUserDataExportResult>()

    mockGetUserDataStats.mockResolvedValue({
      workflow_count: 1,
      chatflow_count: 0,
      folder_count: 0,
      total_count: 1,
    })
    mockBuildAugmentedUserDataExportPackage.mockImplementationOnce(async (params) => {
      params.onProgress?.({
        stage: 'loading-history-details',
        message: '正在读取导出详情（1 / 3）…',
        completed: 1,
        total: 3,
      })
      return deferred.promise
    })

    render(<ExportProbe />)
    fireEvent.click(screen.getByRole('button', { name: '导出' }))

    await waitFor(() => {
      expect(screen.getByTestId('export-progress').textContent).toContain('正在读取导出详情')
    })

    deferred.resolve({
      blob: new Blob(['final-zip'], { type: 'application/zip' }),
      filename: 'user_data_export.zip',
      attachmentSummary: {
        discoveredCount: 0,
        addedCount: 0,
        failedCount: 0,
        skippedRecordCount: 0,
      },
    })

    await waitFor(() => {
      expect(screen.getByTestId('export-progress').textContent).toBe('')
    })

    alertSpy.mockRestore()
  })
})
