// 历史兼容别名与迁移期过渡类型。
// 统一集中导出，避免散落在各业务域文件中产生重复来源。
import type { DifyStreamEvent, LegacyStreamEvent } from './ai-execution'
import type { PasswordLoginRequest, SmsLoginRequest } from './auth'

export type LoginRequest = SmsLoginRequest | PasswordLoginRequest

export type OrderStatus = 0 | 1 | 2

// MixedListItem is canonical in folders-workflow; Workflow types are canonical
// in ai-execution.  They are all re-exported via the api barrel so consumers
// can import them from @/types/api directly.

export type { MixedListItem } from './folders-workflow'

export type StreamEvent = LegacyStreamEvent | DifyStreamEvent
