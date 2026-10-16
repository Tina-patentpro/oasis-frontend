// 常量统一导出

// Common constants
export const NL = '\n'

export * from './tabs'
export * from './themes'
export * from './menus'
export * from './chatUpload'
export * from './uploadLimits'

// Version Info
export const VERSION_INFO = [
  {
    title: '1.0 Fast',
    desc: '快速生成模式，供草稿生成任务使用。使用成本约为 Basic 版的 50%，使用时间约为 Basic 版的 1/3-2/3。',
  },
  {
    title: '1.0 Basic',
    desc: '浅思考模式，供基本任务使用。标准生成能力，满足常规撰写流程。',
  },
  {
    title: '1.0 Pro',
    desc: '深度思考模式，供高价值专利生成任务使用。通过读取更多数据，思考更长时间，以提供高质量输出。使用成本约为 Basic 版的 3-5 倍。',
  },
]
export * from './rechargePackages'
