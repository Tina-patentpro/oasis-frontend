import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { cmsService } from '@/api/services/cms.service'
import { useModelPreferenceStore } from '@/stores/useModelPreferenceStore'
import { useUIStore } from '@/stores/useUIStore'
import type { CategoriesResponse } from '@/types/api'

import { ModelPreferenceSection } from './ModelPreferenceSection'

jest.mock('@/api/services/cms.service', () => ({
  cmsService: {
    getConfigDetail: jest.fn(),
    saveUserLikeCategory: jest.fn(),
  },
}))

const getConfigDetailMock = cmsService.getConfigDetail as jest.MockedFunction<
  typeof cmsService.getConfigDetail
>
const saveUserLikeCategoryMock = cmsService.saveUserLikeCategory as jest.MockedFunction<
  typeof cmsService.saveUserLikeCategory
>

function createConfig(overrides: Partial<CategoriesResponse> = {}): CategoriesResponse {
  return {
    写作工具: [
      {
        id: 101,
        name: '权利要求书',
        group: '写作工具',
        description: '生成权利要求书',
        file_url: '',
        workflow: '',
        sort: 1,
        is_active: true,
        apis: [
          {
            id: 1001,
            sub_category_id: 101,
            ai_model_id: 501,
            aimodel: '标准版',
            api_endpoint: '/claims/standard',
            api_description: '稳定生成',
          },
          {
            id: 1002,
            sub_category_id: 101,
            ai_model_id: 502,
            aimodel: '增强版',
            api_endpoint: '/claims/pro',
            api_description: '增强生成',
          },
        ],
      },
      {
        id: 102,
        name: '说明书',
        group: '写作工具',
        description: '生成说明书',
        file_url: '',
        workflow: '',
        sort: 2,
        is_active: true,
        apis: [
          {
            id: 1003,
            sub_category_id: 102,
            ai_model_id: 503,
            aimodel: '说明书版',
            api_endpoint: '/spec/standard',
            api_description: '说明书生成',
          },
        ],
      },
    ],
    检索工具: [
      {
        id: 201,
        name: '专利检索',
        group: '检索工具',
        description: '检索专利',
        file_url: '',
        workflow: '',
        sort: 1,
        is_active: true,
        apis: [
          {
            id: 2001,
            sub_category_id: 201,
            ai_model_id: 601,
            aimodel: '检索版',
            api_endpoint: '/search/standard',
            api_description: '专利检索',
          },
        ],
      },
    ],
    ...overrides,
  }
}

function resetStores() {
  window.localStorage.clear()
  useModelPreferenceStore.getState().reset()
  useUIStore.getState().hideToast()
}

beforeEach(() => {
  jest.clearAllMocks()
  resetStores()
})

describe('ModelPreferenceSection', () => {
  test('loads the remote preference config and renders the first group, tool, and model choices', async () => {
    getConfigDetailMock.mockResolvedValue(createConfig())

    render(<ModelPreferenceSection themeColor="#10b981" />)

    expect(screen.getByText('正在加载配置…')).toBeInTheDocument()

    expect(await screen.findByRole('button', { name: /写作工具/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '权利要求书' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })
    expect(screen.getByRole('checkbox', { name: '隐藏模型 标准版' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '隐藏模型 增强版' })).toBeChecked()
    expect(getConfigDetailMock).toHaveBeenCalledTimes(1)
  })

  test('keeps at least one visible group, tool, and model version', async () => {
    const user = userEvent.setup()
    getConfigDetailMock.mockResolvedValue(
      createConfig({
        检索工具: [],
        写作工具: [createConfig().写作工具[0]],
      }),
    )

    render(<ModelPreferenceSection themeColor="#10b981" />)

    const groupCheckbox = await screen.findByRole('checkbox', { name: '隐藏工具组 写作工具' })
    await user.click(groupCheckbox)
    expect(useUIStore.getState().toast).toBe('至少保留一个工具组，以确保左栏可用。')
    expect(groupCheckbox).toBeChecked()

    const toolCheckbox = screen.getByRole('checkbox', { name: '隐藏工具 权利要求书' })
    await user.click(toolCheckbox)
    expect(useUIStore.getState().toast).toBe('每个工具组至少保留一个工具。')
    expect(toolCheckbox).toBeChecked()

    useUIStore.getState().hideToast()

    await user.click(screen.getByRole('checkbox', { name: '隐藏模型 标准版' }))
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: '显示模型 标准版' })).not.toBeChecked()
    })

    const remainingModelCheckbox = screen.getByRole('checkbox', { name: '隐藏模型 增强版' })
    await user.click(remainingModelCheckbox)
    expect(useUIStore.getState().toast).toBe('至少保留一个模型版本，以便在左栏选择。')
    expect(remainingModelCheckbox).toBeChecked()

    await user.click(screen.getByRole('button', { name: '全部隐藏' }))
    expect(useUIStore.getState().toast).toBe('至少保留一个模型版本。')
  })

  test('saves only visible tools and models using backend model ids', async () => {
    const user = userEvent.setup()
    getConfigDetailMock.mockResolvedValue(createConfig())
    saveUserLikeCategoryMock.mockResolvedValue(undefined)

    render(<ModelPreferenceSection themeColor="#10b981" />)

    await screen.findByRole('button', { name: /写作工具/ })

    await user.click(screen.getByRole('checkbox', { name: '隐藏工具 说明书' }))
    await user.click(screen.getByRole('checkbox', { name: '隐藏模型 增强版' }))
    await user.click(screen.getByRole('button', { name: '保存喜好设定' }))

    await waitFor(() => {
      expect(saveUserLikeCategoryMock).toHaveBeenCalledWith({
        sub_category_ids: [101, 201],
        ai_model_ids: [501, 601],
      })
    })
    expect(useUIStore.getState().toast).toBe('保存成功！')
  })

  test('shows an empty-state warning and blocks saving when config loading fails', async () => {
    const user = userEvent.setup()
    getConfigDetailMock.mockRejectedValue(new Error('config failed'))

    render(<ModelPreferenceSection themeColor="#10b981" />)

    expect(await screen.findByText('工具配置读取失败或暂无可配置数据。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存喜好设定' }))
    expect(saveUserLikeCategoryMock).not.toHaveBeenCalled()
    expect(useUIStore.getState().toast).toBe('数据未加载完成，请稍后再试')
  })
})
