import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assessPerformanceResults,
  median,
} from './verify-auth-performance.mjs'

function run(overrides = {}) {
  return {
    lcpMs: 700,
    cls: 0,
    longTasks: [],
    diagnostics: [],
    requestCount: 13,
    transferBytes: 280_000,
    ...overrides,
  }
}

test('calculates medians for odd and even run counts', () => {
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([4, 1, 3, 2]), 2.5)
})

test('accepts results within the authentication route budgets', () => {
  const failures = assessPerformanceResults([
    {
      viewport: { width: 375, height: 812 },
      cold: [run({ lcpMs: 2_300 }), run({ lcpMs: 2_400 }), run({ lcpMs: 2_500 })],
      warm: [run(), run({ lcpMs: 800 }), run({ lcpMs: 900 })],
    },
  ])

  assert.deepEqual(failures, [])
})

test('reports LCP, CLS, long-task, diagnostic, request and transfer regressions', () => {
  const failures = assessPerformanceResults([
    {
      viewport: { width: 1280, height: 720 },
      cold: [run({ lcpMs: 2_600 })],
      warm: [
        run({
          lcpMs: 1_100,
          cls: 0.2,
          longTasks: [{ duration: 60 }],
          diagnostics: ['console.error'],
          requestCount: 15,
          transferBytes: 400_000,
        }),
      ],
    },
  ])

  assert.equal(failures.length, 7)
  assert.ok(failures.some((failure) => failure.includes('cold LCP')))
  assert.ok(failures.some((failure) => failure.includes('warm LCP')))
  assert.ok(failures.some((failure) => failure.includes('CLS')))
  assert.ok(failures.some((failure) => failure.includes('long tasks')))
  assert.ok(failures.some((failure) => failure.includes('runtime diagnostics')))
  assert.ok(failures.some((failure) => failure.includes('request count')))
  assert.ok(failures.some((failure) => failure.includes('transfer')))
})
