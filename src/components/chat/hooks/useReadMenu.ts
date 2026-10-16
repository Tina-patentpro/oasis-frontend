import { useCallback, useEffect } from 'react'

import type { ChatTabKey } from '../../../types'

interface UseReadMenuOptions {
  chatTab: ChatTabKey
  readMenuOpen: boolean
  setReadMenuOpen: (open: boolean) => void
}

interface UseReadMenuResult {
  isReadDisabled: boolean
  readDisabledReason?: string
  toggleReadMenu: () => void
  closeReadMenu: () => void
}

export function useReadMenu(options: UseReadMenuOptions): UseReadMenuResult {
  const { chatTab, readMenuOpen, setReadMenuOpen } = options

  const isReadDisabled = chatTab === 'general'
  const readDisabledReason = isReadDisabled
    ? '当前会话暂不支持读取资料，请切换到专利生成或语义生图。'
    : undefined

  const closeReadMenu = useCallback(() => {
    setReadMenuOpen(false)
  }, [setReadMenuOpen])

  const toggleReadMenu = useCallback(() => {
    if (isReadDisabled) return
    setReadMenuOpen(!readMenuOpen)
  }, [isReadDisabled, readMenuOpen, setReadMenuOpen])

  useEffect(() => {
    if (isReadDisabled && readMenuOpen) {
      setReadMenuOpen(false)
    }
  }, [isReadDisabled, readMenuOpen, setReadMenuOpen])

  return {
    isReadDisabled,
    readDisabledReason,
    toggleReadMenu,
    closeReadMenu,
  }
}
