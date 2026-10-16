import { useCallback, useEffect, useRef } from 'react'

import type { Message } from '../../../types'

function formatMessageTime(id: string): string {
  // History messages have numeric IDs that ARE timestamps (seconds or milliseconds)
  const numericId = Number(id)
  if (!isNaN(numericId) && numericId > 1000000000) {
    const ts = numericId > 1e12 ? numericId : numericId * 1000
    const d = new Date(ts)
    if (!isNaN(d.getTime())) {
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      return `${h}:${m}`
    }
  }
  return ''
}

interface UseChatExportOptions {
  messages: Message[]
  notify: (message: string) => void
}

export function useChatExport({ messages, notify }: UseChatExportOptions) {
  const notifyRef = useRef(notify)
  useEffect(() => {
    notifyRef.current = notify
  }, [notify])

  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const handleExportChat = useCallback(() => {
    const currentMessages = messagesRef.current
    if (currentMessages.length <= 1) {
      notifyRef.current('还没有对话内容，请先发送消息')
      return
    }
    const lines: string[] = ['# 对话记录', '']
    const escapeMd = (s: string) =>
      s
        .replace(/([\\`*_{}[\]()|>~])/g, '\\$1')
        .replace(/^([#]+)/gm, '\\$1')
        .replace(/^([-.])/gm, '\\$1')
        .replace(/^(\d+)\./gm, '$1\\.')
    for (const msg of currentMessages) {
      const role = msg.role === 'user' ? '用户' : '助手'
      const time = formatMessageTime(msg.id)
      lines.push(`## ${role}${time ? ` (${time})` : ''}`, '')
      lines.push(escapeMd(msg.content), '')
    }
    const md = lines.join('\n')
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `对话记录_${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notifyRef.current('对话已导出')
  }, [])

  return { handleExportChat }
}
