import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import { RechargeRecordSection } from './RechargeRecordSection'
import { RunningWaterSection } from './RunningWaterSection'
import { UsageSettingsSection } from './UsageSettingsSection'

const mockGetRechargeList = jest.fn<() => Promise<{ items: unknown[]; total: number }>>()
const mockGetRunningWaterList = jest.fn<() => Promise<{ items: unknown[]; total: number }>>()
const mockShowToast = jest.fn()

jest.mock('@/api/services/billing.service', () => ({
  billingService: {
    getRechargeList: () => mockGetRechargeList(),
    getRunningWaterList: () => mockGetRunningWaterList(),
  },
}))

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { id: number } }) => unknown) =>
    selector({ user: { id: 1 } }),
}))

jest.mock('@/stores/useUIStore', () => ({
  useUIStore: {
    getState: () => ({ showToast: mockShowToast }),
  },
}))

describe('settings record feedback semantics', () => {
  beforeEach(() => {
    mockGetRechargeList.mockReset()
    mockGetRunningWaterList.mockReset()
    mockShowToast.mockReset()
  })

  test('usage record loading errors are announced as alerts', async () => {
    mockGetRunningWaterList.mockRejectedValue(new Error('network error'))

    render(<UsageSettingsSection themeColor="#10b981" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('加载失败')
      expect(screen.getByRole('heading', { name: '使用记录' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '导出记录' })).toHaveAttribute(
        'href',
        '/recharge/exportrunningwater?uid=1',
      )
      expect(screen.queryByText('暂无使用记录')).not.toBeInTheDocument()
    })
  })

  test('running water loading errors are announced as alerts', async () => {
    mockGetRunningWaterList.mockRejectedValue(new Error('network error'))

    render(<RunningWaterSection themeColor="#10b981" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('加载失败')
      expect(screen.getByRole('heading', { name: '流水记录' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument()
      expect(screen.queryByText('暂无流水记录')).not.toBeInTheDocument()
    })
  })

  test('recharge record loading errors are announced as alerts', async () => {
    mockGetRechargeList.mockRejectedValue(new Error('network error'))

    render(<RechargeRecordSection themeColor="#10b981" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('加载失败')
      expect(screen.getByRole('heading', { name: '充值记录' })).toBeInTheDocument()
      expect(screen.queryByText('暂无充值记录')).not.toBeInTheDocument()
      expect(mockGetRechargeList).toHaveBeenCalledTimes(1)
    })
  })
})
