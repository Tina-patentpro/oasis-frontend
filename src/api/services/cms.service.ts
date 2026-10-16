/**
 * CMS配置服务
 * 处理系统配置、工具、充值套餐等CMS管理的内容
 */

import type {
  CategoriesResponse,
  RechargePackage,
  ChatMode,
  HelpDoc,
  CustomerServiceInfo,
  ApiReferralCode as ReferralCode,
  ReferralStatistics,
  UseReferralCodeRequest,
  ApiDetail,
  AIModel,
  SubCategory,
} from '@/types/api'

import { apiClient } from '../client'
import { isRecord } from '../validation'
import { billingService } from './billing.service'
import { referralService } from './referral.service'

const STATIC_CHAT_MODES: ChatMode[] = [
  {
    id: 'general',
    name: '通用对话',
    description: '适合日常问答与文案处理',
    pricing: {
      version: 'static',
      pricePerMessage: 0,
    },
    features: ['问答', '总结', '改写'],
  },
  {
    id: 'focus',
    name: '工作聚焦',
    description: '适合结构化任务拆解与执行建议',
    pricing: {
      version: 'static',
      pricePerMessage: 0,
    },
    features: ['任务拆解', '流程建议', '重点提炼'],
  },
  {
    id: 'image',
    name: '语义生图',
    description: '适合图片描述与提示词组织',
    pricing: {
      version: 'static',
      pricePerMessage: 0,
    },
    features: ['提示词', '风格设定', '结构描述'],
  },
]

const STATIC_HELP_DOCS: HelpDoc[] = [
  {
    id: 'quick-start',
    title: '快速开始',
    content: '通过左侧工具栏选择功能，填写输入后执行生成任务。',
    category: '入门',
    sortOrder: 1,
  },
  {
    id: 'faq',
    title: '常见问题',
    content: '如遇问题可先查看帮助文档，或通过客服入口获取支持。',
    category: '支持',
    sortOrder: 2,
  },
]

const STATIC_CUSTOMER_SERVICE_INFO: CustomerServiceInfo = {
  email: 'contact@oasisintwrite.com',
  phone: '400-000-0000',
  wechat: 'oasis-support',
  workingHours: '工作日 09:00 - 18:00',
}

const CATEGORY_NESTED_KEYS = ['data', 'categories', 'items', 'list', 'result'] as const

function normalizeApiModel(raw: unknown, index: number): AIModel | null {
  if (!isRecord(raw)) {
    return null
  }

  const idCandidate = raw['id'] ?? raw['api_id'] ?? raw['ai_model_id'] ?? index + 1
  const id = Number(idCandidate)
  const aiModelId = Number(raw['ai_model_id'] ?? raw['id'] ?? id)
  const subCategoryId = Number(raw['sub_category_id'] ?? 0)

  return {
    id: Number.isFinite(id) ? id : index + 1,
    sub_category_id: Number.isFinite(subCategoryId) ? subCategoryId : 0,
    ai_model_id: Number.isFinite(aiModelId) ? aiModelId : Number.isFinite(id) ? id : index + 1,
    aimodel:
      (typeof raw['aimodel'] === 'string' && raw['aimodel'].trim().length > 0
        ? raw['aimodel'].trim()
        : typeof raw['model_name'] === 'string' && raw['model_name'].trim().length > 0
          ? raw['model_name'].trim()
          : typeof raw['name'] === 'string' && raw['name'].trim().length > 0
            ? raw['name'].trim()
            : '') || `模型${index + 1}`,
    api_endpoint:
      (typeof raw['api_endpoint'] === 'string' ? raw['api_endpoint'] : '') ||
      (typeof raw['endpoint'] === 'string' ? raw['endpoint'] : ''),
    api_description:
      (typeof raw['api_description'] === 'string' ? raw['api_description'] : '') ||
      (typeof raw['description'] === 'string' ? raw['description'] : ''),
    api_process: typeof raw['api_process'] === 'string' ? raw['api_process'] : '',
  }
}

function normalizeSubCategory(
  raw: unknown,
  fallbackGroup: string,
  index: number,
): SubCategory | null {
  if (!isRecord(raw)) {
    return null
  }

  const name =
    (typeof raw['name'] === 'string' && raw['name'].trim().length > 0 ? raw['name'].trim() : '') ||
    (typeof raw['title'] === 'string' && raw['title'].trim().length > 0
      ? raw['title'].trim()
      : '') ||
    ''

  if (!name) {
    return null
  }

  const rawApis = Array.isArray(raw['apis'])
    ? raw['apis']
    : Array.isArray(raw['models'])
      ? raw['models']
      : Array.isArray(raw['api_list'])
        ? raw['api_list']
        : []
  const apis = rawApis
    .map((api, apiIndex) => normalizeApiModel(api, apiIndex))
    .filter((item): item is AIModel => item !== null)

  const idCandidate = raw['id'] ?? raw['sub_category_id'] ?? index + 1
  const numericId = Number(idCandidate)
  const sortCandidate = raw['sort'] ?? raw['sort_order'] ?? index + 1
  const numericSort = Number(sortCandidate)

  return {
    id: Number.isFinite(numericId) ? numericId : index + 1,
    name,
    group:
      (typeof raw['group'] === 'string' && raw['group'].trim().length > 0
        ? raw['group'].trim()
        : fallbackGroup) || fallbackGroup,
    description:
      typeof raw['description'] === 'string'
        ? raw['description']
        : typeof raw['desc'] === 'string'
          ? raw['desc']
          : '',
    file_url: typeof raw['file_url'] === 'string' ? raw['file_url'] : '',
    workflow:
      (typeof raw['workflow'] === 'string' ? raw['workflow'] : '') ||
      (typeof raw['api_endpoint'] === 'string' ? raw['api_endpoint'] : ''),
    sort: Number.isFinite(numericSort) ? numericSort : index + 1,
    is_active: raw['is_active'] !== false,
    apis,
  }
}

function extractSubCategoryArray(raw: unknown, fallbackGroup: string): SubCategory[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item, index) => normalizeSubCategory(item, fallbackGroup, index))
      .filter((item): item is SubCategory => item !== null)
  }

  if (!isRecord(raw)) {
    return []
  }

  const direct = normalizeSubCategory(raw, fallbackGroup, 0)
  if (direct) {
    return [direct]
  }

  for (const key of [...CATEGORY_NESTED_KEYS, 'subCategories', 'sub_categories', 'children']) {
    if (!(key in raw)) {
      continue
    }
    const nested = extractSubCategoryArray(raw[key], fallbackGroup)
    if (nested.length > 0) {
      return nested
    }
  }

  return []
}

function extractCategoryMapFromObject(raw: Record<string, unknown>): CategoriesResponse | null {
  const categories: CategoriesResponse = {}

  Object.entries(raw).forEach(([key, value]) => {
    const normalized = extractSubCategoryArray(value, key)
    if (normalized.length > 0) {
      categories[key] = normalized
    }
  })

  return Object.keys(categories).length > 0 ? categories : null
}

function extractCategoriesResponse(raw: unknown, depth = 0): CategoriesResponse | null {
  if (depth > 4 || raw == null) {
    return null
  }

  if (Array.isArray(raw)) {
    const grouped: CategoriesResponse = {}
    raw.forEach((item, index) => {
      const normalized = normalizeSubCategory(item, '默认分组', index)
      if (!normalized) {
        return
      }
      const groupName =
        typeof normalized.group === 'string' && normalized.group.trim().length > 0
          ? normalized.group.trim()
          : '默认分组'
      if (!grouped[groupName]) {
        grouped[groupName] = []
      }
      grouped[groupName]!.push(normalized)
    })
    return Object.keys(grouped).length > 0 ? grouped : null
  }

  if (!isRecord(raw)) {
    return null
  }

  const objectPayload = raw as Record<string, unknown>
  const directMap = extractCategoryMapFromObject(objectPayload)
  if (directMap) {
    return directMap
  }

  for (const key of CATEGORY_NESTED_KEYS) {
    if (!(key in objectPayload)) {
      continue
    }
    const nested = extractCategoriesResponse(objectPayload[key], depth + 1)
    if (nested && Object.keys(nested).length > 0) {
      return nested
    }
  }

  return null
}

class CMSService {
  /**
   * 获取模型分类列表（三级分类结构）
   * API: /api/apicategories/detail
   * 返回格式：{ data: { "技术研发": [...], "专利撰写": [...], "辅助工具": [...] } }
   * 接口返回的数据格式：
   * {
   *   "专利撰写": [
   *     {
   *       "id": 12,
   *       "name": "申请文件检查",
   *       "group": "专利撰写",
   *       "description": "...",
   *       "file_url": "",
   *       "workflow": "",
   *       "sort": 3,
   *       "is_active": true,
   *       "apis": [...]
   *     }
   *   ]
   * }
   */
  async getCategories(): Promise<CategoriesResponse> {
    // 按 API接口文档-用户端.md 第8节：GET /apicategories/detail
    // 增加轻量重试，降低首次加载抖动导致左栏空白的概率。
    const response = await apiClient.get<{
      code: number
      message: string
      data: CategoriesResponse
    }>('/apicategories/detail', undefined, undefined, {
      retry: {
        retries: 2,
        backoffMs: 300,
      },
    })

    const extracted = extractCategoriesResponse(response)
    if (extracted) {
      return extracted
    }

    console.warn('[CMSService] getCategories: Unexpected response format, returning empty object')

    return {} as CategoriesResponse
  }

  /**
   * 获取用户配置的模型分类列表（用于模型喜好设定页面）
   * 模型喜好接口：GET /api/apicategories/configdetail
   */
  async getConfigDetail(): Promise<CategoriesResponse> {
    const response = await apiClient.get<{
      code: number
      message: string
      data: CategoriesResponse
    }>('/apicategories/configdetail', undefined, undefined, {
      retry: {
        retries: 2,
        backoffMs: 300,
      },
    })

    const extracted = extractCategoriesResponse(response)
    if (extracted) {
      return extracted
    }

    console.warn('[CMSService] getConfigDetail: Unexpected response format, returning empty object')

    return {} as CategoriesResponse
  }

  /**
   * 保存用户喜好的分类和模型配置
   * API: POST /api/apicategories/userlikecategory
   * @param data - 包含用户选择的工具ID和模型ID
   */
  async saveUserLikeCategory(data: {
    ai_model_ids: number[]
    sub_category_ids: number[]
  }): Promise<void> {
    // 使用apiClient发送POST请求
    await apiClient.post<{
      code: number
      message: string
    }>('/apicategories/userlikecategory', data)
  }

  // 注意：以下方法暂时保留以向后兼容，后续可能需要根据新API重新实现
  // 或者在确认不再使用后移除

  /**
   * 获取充值套餐列表
   * 按 API接口文档-用户端.md：GET /recharge/list
   * @deprecated 请改用 billingService.getRechargePackages()
   */
  async getRechargePackages(): Promise<RechargePackage[]> {
    // 兼容保留：统一委托到 billingService，避免同端点多实现
    return await billingService.getRechargePackages()
  }

  /**
   * 获取聊天模式列表
   */
  async getChatModes(): Promise<ChatMode[]> {
    return STATIC_CHAT_MODES
  }

  /**
   * 获取帮助文档列表
   */
  async getHelpDocs(_category?: string): Promise<HelpDoc[]> {
    return STATIC_HELP_DOCS
  }

  /**
   * 获取客服信息
   */
  async getCustomerServiceInfo(): Promise<CustomerServiceInfo> {
    return STATIC_CUSTOMER_SERVICE_INFO
  }

  /**
   * 获取推荐码
   * @deprecated 请改用 referralService.getReferralCode()
   */
  async getReferralCode(): Promise<ReferralCode> {
    // 兼容保留：统一委托到 referralService，避免同端点多实现
    return await referralService.getReferralCode()
  }

  /**
   * 使用推荐码
   */
  async useReferralCode(_data: UseReferralCodeRequest): Promise<void> {
    throw new Error('[CMSService] Backend API not found in API接口文档-用户端.md: useReferralCode')
  }

  /**
   * 获取推荐统计
   * @deprecated 请改用 referralService.getReferralStatistics()
   */
  async getReferralStatistics(): Promise<ReferralStatistics> {
    // 兼容保留：统一委托到 referralService，避免同端点多实现
    return await referralService.getReferralStatistics()
  }

  /**
   * 获取API详情（根据name获取input_schema和output_schema）
   * API: POST /api/apicategories/apidetail
   */
  async getApiDetail(name: string): Promise<ApiDetail> {
    try {
      // 使用apiClient发送POST请求，会自动带上Authorization header
      const response = await apiClient.post<{
        code: number
        message: string
        data: ApiDetail
      }>('/apicategories/apidetail', { name })

      // 检查响应格式并提取data部分
      if (response && typeof response === 'object' && 'data' in response) {
        const result = (response as { data: ApiDetail }).data as ApiDetail

        return result
      }

      // 如果响应本身就已经是 ApiDetail 格式（没有包裹在 data 字段中）
      if (
        response &&
        typeof response === 'object' &&
        'input_schema' in response &&
        'output_schema' in response
      ) {
        return response as unknown as ApiDetail
      }

      // 如果响应格式不对，抛出错误
      console.warn('[CMSService] Unexpected API detail response format')

      throw new Error('Unexpected API response format')
    } catch (error) {
      console.error('[CMSService] API detail request failed:', error)
      console.error(
        '[CMSService] Error details:',
        error instanceof Error ? error.message : String(error),
      )
      // 抛出错误，让调用方处理
      throw error
    }
  }
}

export const cmsService = new CMSService()
