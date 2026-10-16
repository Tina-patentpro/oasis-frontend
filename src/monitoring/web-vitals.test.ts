import { describe, expect, jest, test } from '@jest/globals'

import {
  createWebVitalsSentryReporter,
  registerWebVitalsCallbacks,
  type WebVitalsModule,
} from './web-vitals'

const createWebVitalsModule = (): WebVitalsModule => ({
  onCLS: jest.fn(),
  onFID: jest.fn(),
  onLCP: jest.fn(),
  onFCP: jest.fn(),
  onINP: jest.fn(),
  onTTFB: jest.fn(),
})

describe('web vitals monitoring helpers', () => {
  test('registers every web-vitals callback without reportAllChanges noise', () => {
    const webVitals = createWebVitalsModule()
    const reporter = jest.fn()

    registerWebVitalsCallbacks(webVitals, reporter)

    const callbacks = Object.values(webVitals) as Array<ReturnType<typeof jest.fn>>
    for (const callback of callbacks) {
      expect(callback).toHaveBeenCalledWith(reporter)
      expect(callback.mock.calls[0]).toHaveLength(1)
    }
  })

  test('skips metric reporting until Sentry is ready', () => {
    const captureMessage = jest.fn()
    const reporter = createWebVitalsSentryReporter({
      getSentry: () => ({ captureMessage }),
      isSentryReady: () => false,
    })

    reporter({
      name: 'LCP',
      rating: 'good',
      value: 1234,
      delta: 12,
      id: 'metric-1',
      navigationType: 'navigate',
    } as never)

    expect(captureMessage).not.toHaveBeenCalled()
  })

  test('reports web vital metrics with tags and bounded extra data', () => {
    const captureMessage = jest.fn()
    const reporter = createWebVitalsSentryReporter({
      getSentry: () => ({ captureMessage }),
      isSentryReady: () => true,
    })

    reporter({
      name: 'INP',
      rating: 'needs-improvement',
      value: 280,
      delta: 40,
      id: 'metric-2',
      navigationType: 'reload',
    } as never)

    expect(captureMessage).toHaveBeenCalledWith('web-vital:INP', {
      level: 'info',
      tags: {
        metric_name: 'INP',
        metric_rating: 'needs-improvement',
      },
      extra: {
        value: 280,
        delta: 40,
        id: 'metric-2',
        navigationType: 'reload',
      },
    })
  })
})
