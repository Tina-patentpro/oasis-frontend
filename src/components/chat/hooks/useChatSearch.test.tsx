import { act, renderHook } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'
import type { RefObject } from 'react'
import type { VirtuosoHandle } from 'react-virtuoso'

import type { Message } from '../../../types'

import { useChatSearch } from './useChatSearch'

const messages: Message[] = [
  { id: '1', role: 'user', content: '请分析权利要求书' },
  { id: '2', role: 'assistant', content: '权利要求书优化建议如下' },
]

describe('useChatSearch', () => {
  test('selects the first match when the query changes', () => {
    const scrollToIndex = jest.fn()
    const virtuosoRef = {
      current: { scrollToIndex },
    } as unknown as RefObject<VirtuosoHandle | null>

    const { result } = renderHook(() => useChatSearch({ messages, virtuosoRef }))

    act(() => {
      result.current.handleSearchQueryChange('权利要求')
    })

    expect(result.current.searchMatchCount).toBe(2)
    expect(result.current.searchCurrentIndex).toBe(0)
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 0, behavior: 'smooth' })
  })
})
