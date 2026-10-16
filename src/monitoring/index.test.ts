import { describe, expect, jest, test, beforeEach } from '@jest/globals'

const mockGetMonitoringEnv = jest.fn()
const mockRegisterGlobalErrorHandlers = jest.fn()
const mockRegisterWebVitalsCallbacks = jest.fn()
const mockWebVitalsReporter = jest.fn()
const mockBrowserTracingIntegration = jest.fn(() => ({ name: 'browserTracing' }))
const mockReplayIntegration = jest.fn((options: unknown) => ({ name: 'replay', options }))
const mockSentryInit = jest.fn()
const mockSetTag = jest.fn()

jest.mock('./monitoring-env', () => ({
  getMonitoringEnv: () => mockGetMonitoringEnv(),
}))

jest.mock('./global-error-handlers', () => ({
  registerGlobalErrorHandlers: mockRegisterGlobalErrorHandlers,
}))

jest.mock('./web-vitals', () => ({
  createWebVitalsSentryReporter: jest.fn(() => mockWebVitalsReporter),
  registerWebVitalsCallbacks: mockRegisterWebVitalsCallbacks,
}))

jest.mock('@sentry/browser', () => ({
  browserTracingIntegration: mockBrowserTracingIntegration,
  replayIntegration: mockReplayIntegration,
  init: mockSentryInit,
  setTag: mockSetTag,
}))

jest.mock('web-vitals', () => ({
  onCLS: jest.fn(),
  onFID: jest.fn(),
  onLCP: jest.fn(),
  onFCP: jest.fn(),
  onINP: jest.fn(),
  onTTFB: jest.fn(),
}))

describe('initMonitoring', () => {
  beforeEach(() => {
    mockGetMonitoringEnv.mockReset()
    mockRegisterGlobalErrorHandlers.mockReset()
    mockRegisterWebVitalsCallbacks.mockReset()
    mockBrowserTracingIntegration.mockClear()
    mockReplayIntegration.mockClear()
    mockSentryInit.mockClear()
    mockSetTag.mockClear()
    mockGetMonitoringEnv.mockReturnValue({
      isDev: false,
      sentryDsn: 'https://example@sentry.invalid/1',
      sentryEnvironment: 'test',
      shouldEnableWebVitals: true,
      tagsRaw: '{"app":"oasis"}',
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0,
      replaysErrorSampleRate: 1,
    })
  })

  test('initializes privacy-safe Sentry, global handlers, and web-vitals callbacks', async () => {
    const { initMonitoring } = await import('./index')

    await initMonitoring()

    expect(mockRegisterGlobalErrorHandlers).toHaveBeenCalledTimes(1)
    expect(mockSentryInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://example@sentry.invalid/1',
        environment: 'test',
        tracesSampleRate: 0.2,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1,
        beforeSend: expect.any(Function),
      }),
    )
    expect(mockReplayIntegration).toHaveBeenCalledWith({
      blockAllMedia: true,
      maskAllInputs: true,
      maskAllText: true,
    })
    expect(mockSetTag).toHaveBeenCalledWith('app', 'oasis')
    expect(mockRegisterWebVitalsCallbacks).toHaveBeenCalledWith(
      expect.objectContaining({
        onCLS: expect.any(Function),
        onFID: expect.any(Function),
        onLCP: expect.any(Function),
        onFCP: expect.any(Function),
        onINP: expect.any(Function),
        onTTFB: expect.any(Function),
      }),
      mockWebVitalsReporter,
    )
  })
})
