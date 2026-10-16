import type { FileUrl, WorkflowListParams, WorkflowListResponse } from '@/types/api'
import { normalizeWorkflowResultPayload } from '@/utils/workflow-result'

type RawWorkflowListItem = {
  id: number
  name?: string
  api_name?: string
  type?: number
  folder_id?: number
  created_at: string
  answer?: string
  answer_text?: string
  generatedContent?: string
  response?: unknown
  file_output?: Array<Record<string, unknown>>
  file_url?: FileUrl | null
}

type RawWorkflowListResponse = {
  total: number
  items?: RawWorkflowListItem[]
  item?: RawWorkflowListItem[]
}

export const mapWorkflowListResponse = (
  response: RawWorkflowListResponse,
  params: WorkflowListParams,
): WorkflowListResponse => {
  const rawItems = Array.isArray(response?.items)
    ? response.items
    : Array.isArray(response?.item)
      ? response.item
      : []

  const filteredItems = rawItems.filter((item) => {
    if (params.type === 0) return true
    return item.type === params.type
  })

  const mapped: WorkflowListResponse['item'] = filteredItems.map(
    (item): WorkflowListResponse['item'][number] => {
      const title = item.api_name || item.name || '未命名项目'
      const normalizedWorkflowResult = normalizeWorkflowResultPayload(item)
      const common = {
        id: item.id,
        api_name: title,
        user_id: 0,
        folder_id: item.folder_id ?? 0,
        created_at: item.created_at,
        file_url: normalizedWorkflowResult.file_url ?? undefined,
      }

      if (item.type === 2) {
        return {
          ...common,
          inputs: {
            files: null,
            query: '',
            conversation_id: null,
          },
          response: {
            id: '',
            mode: 'advanced-chat' as const,
            event: 'message' as const,
            answer: normalizedWorkflowResult.text || '',
            task_id: '',
            metadata: {
              usage: {
                latency: 0,
                currency: '',
                total_price: '0',
                prompt_price: '0',
                total_tokens: 0,
                prompt_tokens: 0,
                completion_price: '0',
                time_to_generate: 0,
                completion_tokens: 0,
                time_to_first_token: 0,
                prompt_price_unit: '',
                prompt_unit_price: '0',
                completion_price_unit: '',
                completion_unit_price: '0',
              },
              annotation_reply: null,
              retriever_resources: [],
            },
            created_at: Date.parse(item.created_at) || Date.now(),
            message_id: '',
            conversation_id: '',
          },
        }
      }

      return {
        ...common,
        inputs: {},
        response: {
          data: {
            id: '',
            error: null,
            status: 'completed' as const,
            outputs: normalizedWorkflowResult.outputs || {
              Claims: normalizedWorkflowResult.text || '',
            },
            created_at: Date.parse(item.created_at) || Date.now(),
            finished_at: Date.parse(item.created_at) || Date.now(),
            total_steps: 0,
            workflow_id: '',
            elapsed_time: 0,
            total_tokens: 0,
          },
          task_id: '',
          workflow_run_id: '',
        },
      }
    },
  )

  return {
    total: mapped.length,
    item: mapped,
  }
}
