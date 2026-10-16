// 菜单相关常量

import type { Destination } from '../types'

export const DESTS: readonly Destination[] = [
  { key: 'input', title: '输入材料' },
  { key: 'settingsDict', title: '设置/术语词典' },
  { key: 'projectAssets', title: '项目资料库' },
] as const
