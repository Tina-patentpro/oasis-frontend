import type { InstructionItem } from './instruction-library-types'

export const NAMESPACE_TO_TYPE: Record<string, number> = {
  focus: 1,
  image: 2,
  general: 3,
}

export const MIN_INSTRUCTION_LIST_HEIGHT = 240
export const MAX_INSTRUCTION_LIST_HEIGHT = 520
export const INSTRUCTION_LIST_RESIZE_STEP = 24
export const INSTRUCTION_LIST_RESIZE_PAGE_STEP = 80

export function clampInstructionListHeight(height: number): number {
  return Math.min(Math.max(height, MIN_INSTRUCTION_LIST_HEIGHT), MAX_INSTRUCTION_LIST_HEIGHT)
}

const DEFAULT_FOCUS_INSTRUCTION_LIBRARY: InstructionItem[] = [
  {
    key: 'task-breakdown',
    title: '任务拆解',
    description: '分享当前任务或难题，助手会协助拆解重点和制定执行计划。',
    content: '请帮我分析这个任务的特点，把它分解成可操作的步骤，并制定执行计划。',
  },
  {
    key: 'progress-update',
    title: '进度更新',
    description: '汇报任务进展，获取建议或调整计划。',
    content: '这是我目前的进展情况，请帮我评估进度并给出下一步建议。',
  },
  {
    key: 'problem-solving',
    title: '问题解决',
    description: '遇到困难时寻求帮助，获取解决方案。',
    content: '我在执行过程中遇到这个问题，请帮我分析原因并提供解决思路。',
  },
  {
    key: 'brainstorming',
    title: '头脑风暴',
    description: '需要创意想法或多种解决方案时使用。',
    content: '我需要一些创意点子来解决这个问题，请帮我 brainstorm 多种可能性。',
  },
]

const DEFAULT_GENERAL_INSTRUCTION_LIBRARY: InstructionItem[] = [
  {
    key: 'tech-domain',
    title: '技术领域',
    description: '请根据交底书撰写技术领域部分，技术领域包括两部分：本申请涉及技术及技术方向。',
    content: '请根据交底书撰写技术领域部分，技术领域包括两部分：本申请涉及的技术及其技术方向。',
  },
  {
    key: 'background',
    title: '背景技术',
    description: '你是一名专利代理师，请根据提供的《技术交底书》内容，撰写专利说明书的背景技术。',
    content:
      '你是一名资深的专利代理师，请根据提供的《技术交底书》内容，撰写专利说明书，确保条理清晰、突出技术问题。',
  },
  {
    key: 'disclosure',
    title: '发明内容',
    badge: 'NEW',
    description: '发明内容部分需要依次按照以下三方面的内容和格式输出，括号内为拟述要点。',
    content:
      '请按照专利撰写规范，围绕发明的技术问题、技术方案以及有益效果三个部分，系统撰写说明书的发明内容章节。',
  },
  {
    key: 'implementation',
    title: '具体实施方式',
    badge: 'NEW',
    description: '你是一名严谨的专利代理师，负责撰写专利说明书的具体实施方式章节。',
    content:
      '请以审查员易于理解的方式，详细撰写本专利的具体实施方式，包含必要的流程、部件结构与运行示例。',
  },
  {
    key: 'claims-1',
    title: '权利要求书',
    description: '第一步：提炼核心技术方案，请仔细阅读客户提供的交底材料（包括文字与图示）。',
    content: '请先梳理客户交底材料中的核心技术方案，概括出一项独立权利要求所需的关键技术特征。',
  },
  {
    key: 'claims-2',
    title: '权利要求书',
    description: '第二步：梳理必要技术特征与区别点，确保申请人在明确定义核心技术方案。',
    content:
      '在明确核心技术方案后，请列出支撑该方案的必要技术特征及与现有技术的区别点，为撰写权利要求做准备。',
  },
  {
    key: 'claims-3',
    title: '权利要求书',
    description: '第三步：根据技术特征并撰写独立权利要求1，在上述特征基础上，请清晰撰写权利要求。',
    content:
      '请根据梳理出的技术特征撰写一份独立权利要求1，保证逻辑完整、限定合理，符合专利法相关规范。',
  },
  {
    key: 'claims-4',
    title: '权利要求书',
    description: '第四步：设计从属权利要求体系以突出权利要求的技术层次，设计合理的依附关系。',
    content: '请基于独立权利要求设计一套层次分明的从属权利要求，突出技术特征的逐层限定及有益效果。',
  },
  {
    key: 'abstract',
    title: '摘要',
    description: '请撰写不少于120字的专利摘要，突出技术方案、关键特征与有益效果。',
    content: '请撰写一段120至150字的专利摘要，准确概括技术方案及有益效果，并包含关键技术参数。',
  },
]

const DEFAULT_IMAGE_INSTRUCTION_LIBRARY: InstructionItem[] = [
  {
    key: 'image-style',
    title: '风格设定',
    description: '指定画面风格与气氛，让模型有明确的视觉方向。',
    content:
      '主体：\n场景：\n风格：油画 / 赛博朋克 / 极简插画\n光效：暖光 / 体积光 / 霓虹\n镜头：广角 / 俯视 / 特写\n色调：冷色 / 暖色 / 高对比',
  },
  {
    key: 'image-structure',
    title: '结构描述',
    description: '按前景/中景/背景的层次描述画面结构，提升画面完整度。',
    content: '前景：\n中景：\n背景：\n氛围与天气：\n传达情绪：',
  },
  {
    key: 'image-character',
    title: '角色细节',
    description: '角色外观、服装、神态与姿势的细节提示。',
    content: '角色：\n服装与配饰：\n表情与姿态：\n发型与特征：\n动作或互动：',
  },
  {
    key: 'image-neg',
    title: '反面提示',
    description: '列出需要避免的元素或效果，减少生成偏差。',
    content:
      '避免出现：\n - 多余肢体 / 扭曲结构\n - 模糊 / 噪点 / 低分辨率\n - 文字或水印\n - 不符合品牌规范的元素',
  },
]

export function getDefaultInstructionLibrary(namespace: string): InstructionItem[] {
  if (namespace === 'general') return [...DEFAULT_GENERAL_INSTRUCTION_LIBRARY]
  if (namespace === 'image') return [...DEFAULT_IMAGE_INSTRUCTION_LIBRARY]
  return [...DEFAULT_FOCUS_INSTRUCTION_LIBRARY]
}
