import { StrictMode } from 'react'

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { createRoot } from 'react-dom/client'

import type { ChatflowPromptsResponse } from '@/api/services/ai.service'

jest.mock('@/api/services', () => ({
  aiService: {
    getChatflowPrompts: jest.fn(),
  },
}))

import { aiService } from '@/api/services'

import { DEFAULT_PROMPTS } from './chat-management/presets'
import { useChatflowPrompts } from './chat-management/use-chatflow-prompts'

afterEach(() => {
  jest.clearAllMocks()
})

describe('useChatflowPrompts', () => {
  test('aborts the replayed request and commits its replacement in StrictMode', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >
    const signals: AbortSignal[] = []
    const response: ChatflowPromptsResponse = {
      通用对话: [{ name: 'general', description: 'general prompt' }],
      工作聚焦: [{ name: 'focus', description: 'focus prompt' }],
      语义生图: [{ name: 'image', description: 'image prompt' }],
    }

    getChatflowPromptsMock.mockImplementation((options) => {
      const signal = options?.signal
      if (!signal) {
        return Promise.reject(new Error('missing abort signal'))
      }

      signals.push(signal)
      if (signals.length === 2) {
        return Promise.resolve(response)
      }

      return new Promise((_, reject) => {
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('The operation was aborted', 'AbortError')),
          { once: true },
        )
      })
    })

    function PromptProbe() {
      const prompts = useChatflowPrompts()
      return <output data-testid="chatflow-prompts-probe">{JSON.stringify(prompts)}</output>
    }

    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <StrictMode>
          <PromptProbe />
        </StrictMode>,
      )
    })

    await waitFor(() => expect(getChatflowPromptsMock).toHaveBeenCalledTimes(2))
    expect(signals).toHaveLength(2)
    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
    await waitFor(() =>
      expect(container.querySelector('[data-testid="chatflow-prompts-probe"]')?.textContent).toBe(
        JSON.stringify({
          通用对话: 'general prompt',
          工作聚焦: 'focus prompt',
          语义生图: 'image prompt',
        }),
      ),
    )
    await act(async () => root.unmount())
  })

  test('falls back to the default prompts when loading chatflow prompts fails', async () => {
    const getChatflowPromptsMock = aiService.getChatflowPrompts as jest.MockedFunction<
      typeof aiService.getChatflowPrompts
    >

    getChatflowPromptsMock.mockRejectedValue(new Error('提示词服务不可用'))

    const { result } = renderHook(() => useChatflowPrompts())

    expect(result.current).toBeNull()

    await waitFor(() => {
      expect(result.current).toEqual(DEFAULT_PROMPTS)
    })
  })
})
