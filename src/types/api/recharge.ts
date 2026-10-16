// 5. 充值模块（/recharge）

export interface Transaction {
  id: number
  userId: number
  type: 'recharge' | 'consume' | 'bonus' | 'refund'
  amount: number
  balanceAfter: number
  description: string
  sessionId?: number
  paymentId?: string
  createdAt: string
}

export interface RechargeRequest {
  amount: number
  bonus_amount: number
  type: 1 | 2
  paymentMethod?: 'wechat' | 'alipay'
}

export interface PaymentStatusResponse {
  id: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  amount: number
  createdAt: string
  completedAt?: string
}

export interface CreateOrderResponse {
  code_url: string
  out_trade_no: string
  message: string
}

export interface OrderQueryResponse {
  data: 0 | 1 | 2
}

export interface RechargeConfig {
  id: number
  min_amount: number
  max_amount: number
  allow_decimal: 0 | 1
  min_bonus_eligible_amount: number
  enable_bonus: 0 | 1
  is_enabled: 0 | 1
  rate: number
  updated_at: string
}

export interface UserRunningRecord {
  type: string
  money: number
  balance: number
  pm: 0 | 1
  create_time: string
}

export interface UserRunningListResponse {
  total: number
  item: UserRunningRecord[]
}

export interface UserRunningListParams {
  page: number
  limit: number
}

export interface RechargeRecord {
  order_no: string
  amount: number
  bonus_amount: number
  pay_time: string
  created_time: string
  user_id: number
  user: {
    id: number
    username: string
  }
}

export interface RechargeListResponse {
  total: number
  items: RechargeRecord[]
}

export interface RunningWaterRecord {
  id: number
  uid: number
  title: string
  link_id: number
  type: string
  money: number
  balance: number
  pm: 0 | 1
  create_time: string
}

export interface RunningWaterListResponse {
  total: number
  items: RunningWaterRecord[]
}

export interface RunningWaterListParams {
  page: number
  limit: number
  type?: 'consumption' | 'topup' | 'give' | 'refund'
}

export interface RechargePackage {
  id: number
  name: string
  recharge_amount: number
  bonus_amount: number
  is_recommended: number
  sort_order: number
  is_active: number
  created_at: string
  updated_at: string
  amount: number
  bonusAmount: number
  recommended: boolean
  sortOrder: number
  description: string
}
