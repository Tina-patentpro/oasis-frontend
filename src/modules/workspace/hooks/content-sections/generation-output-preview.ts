import type { ApiDetail } from '@/types/api'
import {
  createWorkflowOutputSchemaTextFields,
  createWorkflowOutputTextFields,
  type WorkflowOutputTextField,
} from '@/utils/workflow-output-text'

export function buildWorkflowOutputTextFieldsForPreview(
  responseOutputs: Record<string, unknown> | undefined,
  apiDetail: ApiDetail,
): WorkflowOutputTextField[] {
  return [
    ...createWorkflowOutputTextFields(responseOutputs),
    ...createWorkflowOutputSchemaTextFields(apiDetail.output_schema),
  ]
}
