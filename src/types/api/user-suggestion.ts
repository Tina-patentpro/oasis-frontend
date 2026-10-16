// 9. 用户建议模块（/usersuggestion）

export interface CreateUserSuggestionRequest {
  title: string
  content: string
  url: string
  contact_information: string
}

export interface CreateUserSuggestionResponse {
  submitter_name: string
  title: string
  content: string
  status: string
  reward_status: string
  submitted_at: string
}

export interface CustomerServiceInfo {
  email: string
  phone: string
  wechat: string
  workingHours: string
}

export interface HelpDoc {
  id: string
  title: string
  content: string
  category: string
  sortOrder: number
}
