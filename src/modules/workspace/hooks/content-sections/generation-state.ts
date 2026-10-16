export type GenerationStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'partial_success'
  | 'failed'
  | 'success'

interface GenerationState {
  status: GenerationStatus
}

type GenerationEvent = {
  type: 'START' | 'PARTIAL' | 'SUCCESS' | 'ERROR' | 'RESET'
}

export function reduceGenerationState(
  state: GenerationState,
  event: GenerationEvent,
): GenerationState {
  if (event.type === 'START') {
    return { status: 'running' }
  }
  if (event.type === 'PARTIAL') {
    return { status: 'partial_success' }
  }
  if (event.type === 'SUCCESS') {
    return { status: 'success' }
  }
  if (event.type === 'ERROR') {
    return { status: 'failed' }
  }
  return { ...state, status: 'idle' }
}
