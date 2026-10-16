import type { ChatTabKey } from '../../types'

export const PLACEHOLDER_BY_TAB: Record<string, string> = {
  focus: '描述你要分析的专利内容或技术问题…',
  image: '描述你想要的图像效果或风格…',
  general: '向助手描述你的问题或需求…',
}

export const INSTRUCTION_LIBRARY_LABELS: Record<ChatTabKey, string> = {
  general: '指令库Ⅲ',
  focus: '指令库Ⅰ',
  image: '指令库Ⅱ',
}

export type ChatTabOption = { key: string; label: string; hint: string }

export type TextareaHeightPresetKey = 'compact' | 'standard' | 'expanded'

export const MIN_TEXTAREA_HEIGHT = 72
export const TEXTAREA_AUTO_MAX_HEIGHT = 320
export const CHAT_INPUT_MAX_LENGTH = 20000
export const DEFAULT_TEXTAREA_HEIGHT_PRESET: TextareaHeightPresetKey = 'standard'
export const TEXTAREA_HEIGHT_PRESET_ORDER: TextareaHeightPresetKey[] = [
  'compact',
  'standard',
  'expanded',
]
export const TEXTAREA_HEIGHT_PRESETS: Record<
  TextareaHeightPresetKey,
  { label: string; baseHeight: number }
> = {
  compact: { label: '紧凑', baseHeight: 72 },
  standard: { label: '标准', baseHeight: 150 },
  expanded: { label: '展开', baseHeight: 240 },
}
