// 8. AI 功能模块（分类/目录/接口详情）

export interface ModelCategory {
  id: number | string
  name: string
  description?: string
  sort_order?: number
  icon?: string
  tools?: string[]
  sortOrder?: number
}

export interface Tool {
  id: number | string
  name: string
  category_id: number
  category: string
  api_endpoint: string
  description: string
  is_active: boolean
  sort_order?: number
  versions?: Array<{
    id: string
    name: string
    description: string
  }>
  is_async?: number
}

export interface AIModel {
  id: number
  sub_category_id: number
  ai_model_id: number
  aimodel: string
  api_endpoint: string
  api_description: string
  api_process?: string
  is_async?: number
}

export interface ApiInputField {
  type: 'text' | 'paragraph' | 'select' | 'number' | 'file' | 'file_list' | 'image'
  cn_name: string
  en_name: string
  content: string
  options?: string[]
}

export interface ApiOutputField {
  type: 'string' | 'file'
  cn_name: string
  en_name: string
  content: string
}

export interface ApiDetail {
  id: number
  name: string
  api_type: 'Workflow' | 'Completion'
  price: number
  is_async: number
  input_schema: ApiInputField[]
  output_schema: ApiOutputField[]
  created_at: string
  updated_at: string
}

export interface SubCategory {
  id: number
  name: string
  group: string
  description: string
  file_url: string
  workflow: string
  sort: number
  is_active: boolean
  apis: AIModel[]
}

export interface CategoriesResponse {
  [categoryName: string]: SubCategory[]
}

export interface HomeCategory {
  id: number
  name: string
  count: number
  apis: AIModel[]
}

export interface WorkflowStep {
  label: string
  description?: string
  status?: 'pending' | 'active' | 'completed'
  durationSeconds?: number
}

export interface InputSection {
  key: string
  label: string
  placeholder?: string
  inputMode?: 'text' | 'file' | 'image' | 'reference'
  isMultiFile?: boolean
  supportsFileUpload: boolean
  supportsImageUpload: boolean
  required: boolean
}

export interface SampleData {
  input: Record<string, unknown>
  output: unknown
  examples?: Array<{
    id: string
    title: string
    description?: string
    inputs: Record<string, unknown>
    outputs?: Record<string, unknown>
  }>
  lastUpdated?: string
}

export interface ChatMode {
  id: string
  name: string
  description: string
  pricing: {
    version: string
    pricePerMessage: number
  }
  features: string[]
}
