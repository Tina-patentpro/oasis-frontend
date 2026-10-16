import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'

import type { VirtuosoHandle } from 'react-virtuoso'

import type { Message } from '../../../types'

interface UseChatSearchOptions {
  messages: Message[]
  virtuosoRef: RefObject<VirtuosoHandle | null>
  /** Called when search should close the read/menu overlays */
  onCloseOverlays?: () => void
}

export function useChatSearch({ messages, virtuosoRef, onCloseOverlays }: UseChatSearchOptions) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCurrentIndex, setSearchCurrentIndex] = useState(-1)

  const clearSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchCurrentIndex(-1)
  }, [])

  // Close search on Escape, open on Ctrl+Shift+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        const active = document.activeElement
        const panel = document.querySelector('[role="log"]')
        if (panel && panel.contains(active)) {
          e.preventDefault()
          setSearchOpen(true)
        }
      }
      if (e.key === 'Escape') {
        if (searchOpen) {
          clearSearch()
        }
        onCloseOverlays?.()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen, clearSearch, onCloseOverlays])

  const { searchMatchCount, searchMatchIndices } = useMemo(() => {
    if (!searchQuery) return { searchMatchCount: 0, searchMatchIndices: [] as number[] }
    const lowerQuery = searchQuery.toLowerCase()
    const indices: number[] = []
    messages.forEach((msg, idx) => {
      if (msg.content.toLowerCase().includes(lowerQuery)) {
        indices.push(idx)
      }
    })
    return { searchMatchCount: indices.length, searchMatchIndices: indices }
  }, [messages, searchQuery])

  const lowerQuery = searchQuery.toLowerCase()

  const isMatch = useCallback(
    (msg: Message): boolean => {
      return !!(lowerQuery && msg.content.toLowerCase().includes(lowerQuery))
    },
    [lowerQuery],
  )

  const handleSearchNext = useCallback(() => {
    if (searchMatchIndices.length === 0) return
    const next = searchCurrentIndex + 1 >= searchMatchIndices.length ? 0 : searchCurrentIndex + 1
    setSearchCurrentIndex(next)
    virtuosoRef.current?.scrollToIndex({ index: searchMatchIndices[next], behavior: 'smooth' })
  }, [searchMatchIndices, searchCurrentIndex, virtuosoRef])

  const handleSearchPrev = useCallback(() => {
    if (searchMatchIndices.length === 0) return
    const prev = searchCurrentIndex <= 0 ? searchMatchIndices.length - 1 : searchCurrentIndex - 1
    setSearchCurrentIndex(prev)
    virtuosoRef.current?.scrollToIndex({ index: searchMatchIndices[prev], behavior: 'smooth' })
  }, [searchMatchIndices, searchCurrentIndex, virtuosoRef])

  const openSearch = useCallback(() => {
    setSearchOpen(true)
  }, [])

  const handleSearchQueryChange = useCallback(
    (value: string) => {
      setSearchQuery(value)

      if (!value) {
        setSearchCurrentIndex(-1)
        return
      }

      const lowerValue = value.toLowerCase()
      const firstMatchIndex = messages.findIndex((msg) =>
        msg.content.toLowerCase().includes(lowerValue),
      )

      if (firstMatchIndex === -1) {
        setSearchCurrentIndex(-1)
        return
      }

      setSearchCurrentIndex(0)
      virtuosoRef.current?.scrollToIndex({ index: firstMatchIndex, behavior: 'smooth' })
    },
    [messages, virtuosoRef],
  )

  return {
    searchOpen,
    searchQuery,
    searchCurrentIndex,
    searchMatchCount,
    searchMatchIndices,
    openSearch,
    clearSearch,
    handleSearchNext,
    handleSearchPrev,
    handleSearchQueryChange,
    isMatch,
  }
}
