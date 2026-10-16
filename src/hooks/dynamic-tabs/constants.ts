import { VERSION_INFO } from '@/constants'

import type { ToolVersion } from './types'

export const TOOL_NAME_TO_ID = new Map<string, string>([
  ['技术调查', 'rd.tech-survey'],
  ['Triz分析', 'rd.triz-analysis'],
  ['辅助研发', 'rd.dev-support'],
  ['专利检索', 'rd.patent-search'],
  ['技术交底书完善', 'draft.disclosure-improve'],
  ['权利要求生成', 'draft.claim-generate'],
  ['说明书生成', 'draft.spec-generate'],
  ['专利增量检索', 'draft.incremental-search'],
  ['申请文件检查', 'draft.filing-check'],
  ['术语校验', 'utils.term-check'],
  ['附图生成', 'utils.diagram-generate'],
  ['附图说明生成', 'utils.diagram-desc'],
  ['专利对比', 'utils.patent-compare'],
  ['审查意见答复', 'utils.office-response'],
])

export const TOOL_ID_TO_NAME = new Map<string, string>(
  Array.from(TOOL_NAME_TO_ID.entries()).map(([name, id]) => [id, name]),
)

export const FALLBACK_TOOL_DESCRIPTIONS: Record<string, string> = {
  技术调查: '梳理技术现状与竞品信息，输出结构化调研结论。',
  Triz分析: '基于 TRIZ 方法拆解技术矛盾，生成创新突破点。',
  辅助研发: '整理研发资料并拓展技术创意的智能助手。',
  专利检索: '构建检索式并筛选结果，梳理现有技术布局情况。',
  技术交底书完善: '补充技术细节并生成规范的技术交底书。',
  权利要求生成: '根据技术方案快速生成专利权利要求。',
  说明书生成: '自动生成符合格式要求的专利说明书。',
  专利增量检索: '对既有检索结果做增量更新，评估新增风险与机会。',
  申请文件检查: '检查专利申请材料的结构与合规性。',
  术语校验: '校验术语表述的一致性与规范性。',
  附图生成: '根据技术要点生成可用于申请文件的示意图草稿。',
  附图说明生成: '对照图号自动生成结构与步骤的图示说明。',
  专利对比: '快速比对不同专利的权利要求与技术亮点差异。',
  审查意见答复: '解读审查意见并草拟针对性的答复策略。',
}

export const FALLBACK_VERSION_LIST: ToolVersion[] = VERSION_INFO.map((info) => ({
  id: info.title,
  name: info.title,
  description: info.desc,
}))
