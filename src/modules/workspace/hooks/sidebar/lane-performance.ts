export type WorkspaceLane = 'primary' | 'secondary'
export type WorkspaceLanePhase = 'start' | 'ready'

export interface WorkspaceLaneMarks {
  generation: number
  primaryStart: boolean
  primaryReady: boolean
  secondaryStart: boolean
  secondaryReady: boolean
}

export interface MarkLanePhaseParams {
  marks: WorkspaceLaneMarks
  currentGeneration: number
  lane: WorkspaceLane
  phase: WorkspaceLanePhase
}

export interface MarkLanePhaseResult {
  marks: WorkspaceLaneMarks
  shouldMark: boolean
  markName: string
}

export function createLaneMarks(generation: number): WorkspaceLaneMarks {
  return {
    generation,
    primaryStart: false,
    primaryReady: false,
    secondaryStart: false,
    secondaryReady: false,
  }
}

function getFlagName(lane: WorkspaceLane, phase: WorkspaceLanePhase): keyof WorkspaceLaneMarks {
  if (lane === 'primary' && phase === 'start') {
    return 'primaryStart'
  }
  if (lane === 'primary' && phase === 'ready') {
    return 'primaryReady'
  }
  if (lane === 'secondary' && phase === 'start') {
    return 'secondaryStart'
  }
  return 'secondaryReady'
}

export function markLanePhase(params: MarkLanePhaseParams): MarkLanePhaseResult {
  const baseMarks =
    params.marks.generation === params.currentGeneration
      ? params.marks
      : createLaneMarks(params.currentGeneration)
  const flagName = getFlagName(params.lane, params.phase)
  const markName = `${params.lane}_lane_${params.phase}`

  if (baseMarks[flagName]) {
    return {
      marks: baseMarks,
      shouldMark: false,
      markName,
    }
  }

  return {
    marks: {
      ...baseMarks,
      [flagName]: true,
    },
    shouldMark: true,
    markName,
  }
}
