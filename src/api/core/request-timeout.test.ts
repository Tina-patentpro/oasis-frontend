import { describe, expect, test } from '@jest/globals'

import { mergeAbortSignals, withTimeoutAbort } from './request-timeout'

describe('request-timeout', () => {
  test('aborts via timeout when request hangs', async () => {
    const timeoutSignal = withTimeoutAbort(10).signal
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(timeoutSignal.aborted).toBe(true)
  })

  test('merged signal is aborted when external signal aborts', () => {
    const external = new AbortController()
    const merged = mergeAbortSignals(external.signal, withTimeoutAbort(1000).signal)
    external.abort()
    expect(merged.aborted).toBe(true)
  })
})
