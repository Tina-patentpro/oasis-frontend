// 标签页和内容页相关常量

import type { Tab, ContentPage, ToolName } from '@/types/workspace'
import type { ChatTab, ChatTabKey } from '@/types'

/**
 * Chatflow 会话标题前缀 → ChatTabKey 映射
 * 后端在创建 chatflow 会话时按模式设置标题前缀
 */
const CHATFLOW_TITLE_MODE_MAP: Array<{ prefix: string; mode: ChatTabKey }> = [
  { prefix: '工作聚焦', mode: 'focus' },
  { prefix: '语义生图', mode: 'image' },
  { prefix: '通用对话', mode: 'general' },
]

/**
 * 从 chatflow 会话标题推断对话模式
 */
export function resolveChatModeFromTitle(title: string | undefined | null): ChatTabKey | null {
  const trimmed = (title ?? '').trim()
  for (const { prefix, mode } of CHATFLOW_TITLE_MODE_MAP) {
    if (trimmed.startsWith(prefix)) return mode
  }
  return null
}

/**
 * 从 parsed inputs 对象中提取 conversation_id
 */
export function extractConversationId(
  inputs: Record<string, unknown> | null | undefined,
): string | null {
  if (!inputs || typeof inputs !== 'object') return null
  const convId = inputs.conversation_id
  if (typeof convId === 'string' && convId) return convId
  return null
}

export function parseChatflowInputType(value: unknown): 1 | 2 | 3 | undefined {
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN

  if (parsed === 1 || parsed === 2 || parsed === 3) {
    return parsed
  }

  return undefined
}

/**
 * 根据 chatflow inputs.type 确定 toolType
 * type: 1=工作聚焦, 2=语义生图, 3=通用对话
 */
export function resolveChatflowToolType(inputType: number | undefined): string {
  if (inputType === 1) return 'chat.focus'
  if (inputType === 2) return 'chat.image'
  return 'chat.general'
}

/**
 * 当远端 CMS 数据不可用时使用的默认工具集合
 * 注意：已移除硬编码数据，强制应用完全依赖后端配置
 */
export const FALLBACK_TOOL_NAMES: ToolName[] = []

/**
 * 默认标签配置（CMS 数据不可用时使用）
 * 注意：已移除硬编码数据，强制应用完全依赖后端配置
 */
export const FALLBACK_TABS: Tab[] = []

/**
 * 默认输入内容页签
 */
export const FALLBACK_CONTENT_PAGES: ContentPage[] = [
  { key: 'userInstruction', label: '用户指令' },
  { key: 'overview', label: '技术交底书概要' },
  { key: 'background', label: '背景技术' },
  { key: 'solution', label: '技术方案' },
  { key: 'benefit', label: '有益效果' },
  { key: 'example', label: '实施例' },
  { key: 'drawing', label: '附图说明' },
]

/**
 * 默认聊天页签
 */
export const FALLBACK_CHAT_TABS: ChatTab[] = [
  { key: 'focus', label: '工作聚焦', hint: '分享当前任务或难题,助手可协助拆解重点。' },
  { key: 'image', label: '语义生图', hint: '描述想要的图像或风格,助手会整理语义提示词。' },
  { key: 'general', label: '通用对话', hint: '与助手自由交流,获取写作灵感与修改建议。' },
]

// 为兼容旧代码保留原有命名导出
export const TABS = FALLBACK_TABS
export const CHAT_TABS = FALLBACK_CHAT_TABS
