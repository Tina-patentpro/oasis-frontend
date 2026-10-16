import { describe, expect, test } from '@jest/globals'

import { createLaneMarks, markLanePhase } from './lane-performance'

describe('workspace sidebar lane performance marks', () => {
  test('marks a lane phase once and returns the performance mark name', () => {
    const result = markLanePhase({
      marks: createLaneMarks(1),
      currentGeneration: 1,
      lane: 'primary',
      phase: 'start',
    })

    expect(result).toEqual({
      marks: {
        generation: 1,
        primaryStart: true,
        primaryReady: false,
        secondaryStart: false,
        secondaryReady: false,
      },
      shouldMark: true,
      markName: 'primary_lane_start',
    })
  })

  test('skips duplicate marks for the same lane phase', () => {
    const first = markLanePhase({
      marks: createLaneMarks(1),
      currentGeneration: 1,
      lane: 'secondary',
      phase: 'ready',
    })
    const second = markLanePhase({
      marks: first.marks,
      currentGeneration: 1,
      lane: 'secondary',
      phase: 'ready',
    })

    expect(second.shouldMark).toBe(false)
    expect(second.markName).toBe('secondary_lane_ready')
    expect(second.marks).toEqual(first.marks)
  })

  test('resets stale marks when lane generation changes', () => {
    const previous = {
      generation: 1,
      primaryStart: true,
      primaryReady: true,
      secondaryStart: true,
      secondaryReady: true,
    }

    const result = markLanePhase({
      marks: previous,
      currentGeneration: 2,
      lane: 'primary',
      phase: 'ready',
    })

    expect(result).toEqual({
      marks: {
        generation: 2,
        primaryStart: false,
        primaryReady: true,
        secondaryStart: false,
        secondaryReady: false,
      },
      shouldMark: true,
      markName: 'primary_lane_ready',
    })
  })
})
