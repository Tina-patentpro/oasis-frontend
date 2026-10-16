import { useEffect, useState } from 'react'

import { isAbortLikeError } from '@/api/core/error-utils'
import { aiService } from '@/api/services'

import { DEFAULT_PROMPTS } from './presets'

export function useChatflowPrompts(): Record<string, string> | null {
  const [chatflowPrompts, setChatflowPrompts] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const fetchPrompts = async () => {
      try {
        const response = await aiService.getChatflowPrompts({ signal: controller.signal })
        if (controller.signal.aborted) return

        const promptsMap: Record<string, string> = {}
        Object.entries(response).forEach(([key, items]) => {
          if (items && items.length > 0) {
            promptsMap[key] = items[0].description
          }
        })

        if (Object.keys(promptsMap).length > 0) {
          setChatflowPrompts(promptsMap)
        }
      } catch (error) {
        if (controller.signal.aborted || isAbortLikeError(error)) return
        setChatflowPrompts(DEFAULT_PROMPTS)
      }
    }

    fetchPrompts()

    return () => {
      controller.abort()
    }
  }, [])

  return chatflowPrompts
}
