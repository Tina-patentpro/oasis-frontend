import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
} from 'react'

import { useClickOutside } from '../../../hooks/useClickOutside'
import { isAbortLikeError } from '@/api/core/error-utils'
import { instructionService } from '@/api/services/instruction.service'
import type { Instruction } from '@/api/services/instruction.service'
import { useUIStore } from '@/stores/useUIStore'

import {
  INSTRUCTION_LIST_RESIZE_PAGE_STEP,
  INSTRUCTION_LIST_RESIZE_STEP,
  MAX_INSTRUCTION_LIST_HEIGHT,
  MIN_INSTRUCTION_LIST_HEIGHT,
  NAMESPACE_TO_TYPE,
  clampInstructionListHeight,
} from './instruction-library-config'
import type { InstructionFormState, InstructionItem } from './instruction-library-types'

interface UseInstructionLibraryOptions {
  enabled: boolean
  namespace: string
  onSelectInstruction: (content: string) => void
}

function canDeleteApiInstruction(item: Instruction): boolean {
  if (item.can_delete !== undefined) {
    return item.can_delete === true
  }
  return item.is_custom === true
}

interface UseInstructionLibraryResult {
  instructionLibrary: InstructionItem[]
  isLoading: boolean
  instructionOpen: boolean
  showInstructionForm: boolean
  instructionListHeight: number
  newInstruction: InstructionFormState
  validationError: string
  loadError: string
  operationError: string
  deletingInstructionKey: string | null
  isCreatingInstruction: boolean
  instructionBtnRef: MutableRefObject<HTMLButtonElement | null>
  instructionAddBtnRef: MutableRefObject<HTMLButtonElement | null>
  instructionPanelRef: MutableRefObject<HTMLDivElement | null>
  toggleInstruction: () => void
  closeInstruction: () => void
  toggleInstructionForm: () => void
  setNewInstruction: Dispatch<SetStateAction<InstructionFormState>>
  handleInstructionSelect: (content: string) => void
  handleInstructionDelete: (key: string) => Promise<void>
  handleInstructionCreate: () => void
  handleInstructionCancel: () => void
  reloadInstructions: () => Promise<void>
  startInstructionResize: (event: ReactMouseEvent<HTMLElement>) => void
  handleInstructionResizeKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
}

export function useInstructionLibrary(
  options: UseInstructionLibraryOptions,
): UseInstructionLibraryResult {
  const { enabled, namespace, onSelectInstruction } = options
  const instructionBtnRef = useRef<HTMLButtonElement>(null)
  const instructionAddBtnRef = useRef<HTMLButtonElement>(null)
  const instructionPanelRef = useRef<HTMLDivElement>(null)

  const [instructionLibrary, setInstructionLibrary] = useState<InstructionItem[]>([])

  // 追踪 API 数据是否已加载完成（namespace 变化时重置为 true，API fetch 开始后设为 false）
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [operationError, setOperationError] = useState('')
  const [deletingInstructionKey, setDeletingInstructionKey] = useState<string | null>(null)
  const [isCreatingInstruction, setIsCreatingInstruction] = useState(false)

  // namespace 变化时重置状态
  const prevNamespaceRef = useRef(namespace)
  useEffect(() => {
    if (prevNamespaceRef.current === namespace) return
    prevNamespaceRef.current = namespace
    setInstructionLibrary([])
    setIsLoading(true)
    setLoadError('')
    setOperationError('')
    setDeletingInstructionKey(null)
    setIsCreatingInstruction(false)
    setInstructionOpen(false)
    setShowInstructionForm(false)
  }, [namespace])
  const [instructionOpen, setInstructionOpen] = useState(false)
  const [showInstructionForm, setShowInstructionForm] = useState(false)
  const [instructionListHeight, setInstructionListHeight] = useState(320)
  const [newInstruction, setNewInstructionRaw] = useState<InstructionFormState>({
    title: '',
    content: '',
  })
  const [validationError, setValidationError] = useState('')

  const setNewInstruction: Dispatch<SetStateAction<InstructionFormState>> = useCallback(
    (action) => {
      setNewInstructionRaw(action)
      setValidationError('')
    },
    [],
  )

  const closeInstruction = useCallback(() => setInstructionOpen(false), [])
  const toggleInstruction = useCallback(() => {
    if (!enabled) return
    setInstructionOpen((prev) => !prev)
  }, [enabled])

  const toggleInstructionForm = useCallback(() => {
    if (isCreatingInstruction) return
    setShowInstructionForm((prev) => !prev)
    setValidationError('')
  }, [isCreatingInstruction])

  // 从API加载指令
  const loadInstructionsFromApi = useCallback(
    async (signal?: AbortSignal) => {
      const type = NAMESPACE_TO_TYPE[namespace]
      if (!type) {
        console.warn(`Unknown namespace: ${namespace}`)
        setInstructionLibrary([])
        setLoadError('提示词加载失败，请稍后重试')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadError('')
      setOperationError('')
      try {
        const response = await instructionService.getInstructionListWithOptions(
          { type, page: 1, limit: 50 },
          { signal },
        )
        if (signal?.aborted) {
          return
        }

        if (response.item && Array.isArray(response.item)) {
          // 将API返回的指令转换为InstructionItem格式
          const apiInstructions: InstructionItem[] = response.item.map((item: Instruction) => {
            const canDelete = canDeleteApiInstruction(item)
            return {
              key: `api-${item.id}`,
              title: item.title,
              description: item.content,
              content: item.content,
              badge: item.is_new === 1 ? 'NEW' : undefined,
              canDelete,
              isCustom: canDelete,
            }
          })

          setInstructionLibrary(apiInstructions)
        } else {
          console.warn(`[${namespace}] API响应格式异常:`, response)
          setInstructionLibrary([])
          setLoadError('提示词加载失败，请稍后重试')
        }
      } catch (error) {
        if (signal?.aborted || isAbortLikeError(error)) {
          return
        }
        setInstructionLibrary([])
        setLoadError('提示词加载失败，请稍后重试')
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [namespace],
  )

  // 在组件挂载时从API加载指令
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        void loadInstructionsFromApi(controller.signal)
      }
    }, 0)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [enabled, loadInstructionsFromApi])

  const reloadInstructions = useCallback(async () => {
    await loadInstructionsFromApi()
  }, [loadInstructionsFromApi])

  const handleInstructionSelect = useCallback(
    (content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return
      onSelectInstruction(trimmed)
      closeInstruction()
    },
    [closeInstruction, onSelectInstruction],
  )

  const handleInstructionDelete = useCallback(
    async (key: string) => {
      if (isLoading || deletingInstructionKey) return
      const targetInstruction = instructionLibrary.find((item) => item.key === key)
      if (
        !targetInstruction ||
        !(targetInstruction.canDelete ?? targetInstruction.isCustom ?? false)
      )
        return

      if (key.startsWith('api-')) {
        const numericId = parseInt(key.replace('api-', ''), 10)
        if (!isNaN(numericId)) {
          try {
            setDeletingInstructionKey(key)
            setOperationError('')
            await instructionService.deleteInstruction(numericId)
            await loadInstructionsFromApi()
          } catch (err) {
            console.warn(`[${namespace}] 删除指令失败:`, err)
            setOperationError('删除提示词失败，请稍后重试')
            useUIStore.getState().showToast('删除提示词失败，请稍后重试')
          } finally {
            setDeletingInstructionKey((currentKey) => (currentKey === key ? null : currentKey))
          }
        }
      }
    },
    [instructionLibrary, namespace, loadInstructionsFromApi, isLoading, deletingInstructionKey],
  )

  const resetInstructionForm = useCallback(() => {
    setShowInstructionForm(false)
    setNewInstruction({ title: '', content: '' })
  }, [setShowInstructionForm, setNewInstruction])

  const handleInstructionCreate = useCallback(async () => {
    if (isLoading || isCreatingInstruction) return
    const title = newInstruction.title.trim()
    const content = newInstruction.content.trim()
    if (!title || !content) {
      setValidationError('请完整填写标题与内容')
      return
    }

    const type = NAMESPACE_TO_TYPE[namespace]
    if (!type) {
      console.warn(`Unknown namespace: ${namespace}`)
      setOperationError('创建指令失败，请重试')
      return
    }

    try {
      setIsCreatingInstruction(true)
      setOperationError('')
      // 调用API创建指令
      await instructionService.createInstruction({
        type,
        title,
        content,
        is_new: 0,
      })

      // 重新加载指令列表
      await loadInstructionsFromApi()

      resetInstructionForm()
    } catch (error) {
      console.error(`[${namespace}] 创建指令失败:`, error)
      setOperationError('创建指令失败，请重试')
      useUIStore.getState().showToast('创建指令失败，请重试')
    } finally {
      setIsCreatingInstruction(false)
    }
  }, [
    isCreatingInstruction,
    isLoading,
    loadInstructionsFromApi,
    newInstruction.content,
    newInstruction.title,
    namespace,
    resetInstructionForm,
  ])

  const handleInstructionCancel = useCallback(() => {
    if (isCreatingInstruction) return
    resetInstructionForm()
  }, [isCreatingInstruction, resetInstructionForm])

  const startInstructionResize = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const startY = event.clientY
      const startHeight = instructionListHeight
      const handleMove = (e: MouseEvent) => {
        const delta = startY - e.clientY
        const next = clampInstructionListHeight(startHeight + delta)
        setInstructionListHeight(next)
      }
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
      event.preventDefault()
    },
    [instructionListHeight],
  )

  const handleInstructionResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      const updateHeight = (nextHeight: number) => {
        event.preventDefault()
        setInstructionListHeight(clampInstructionListHeight(nextHeight))
      }

      if (event.key === 'ArrowUp') {
        updateHeight(instructionListHeight + INSTRUCTION_LIST_RESIZE_STEP)
      } else if (event.key === 'ArrowDown') {
        updateHeight(instructionListHeight - INSTRUCTION_LIST_RESIZE_STEP)
      } else if (event.key === 'PageUp') {
        updateHeight(instructionListHeight + INSTRUCTION_LIST_RESIZE_PAGE_STEP)
      } else if (event.key === 'PageDown') {
        updateHeight(instructionListHeight - INSTRUCTION_LIST_RESIZE_PAGE_STEP)
      } else if (event.key === 'Home') {
        updateHeight(MIN_INSTRUCTION_LIST_HEIGHT)
      } else if (event.key === 'End') {
        updateHeight(MAX_INSTRUCTION_LIST_HEIGHT)
      }
    },
    [instructionListHeight],
  )

  // Close instruction form when instruction panel closes
  useEffect(() => {
    if (instructionOpen) {
      return
    }
    let canceled = false
    queueMicrotask(() => {
      if (canceled) return
      setShowInstructionForm((prev) => (prev ? false : prev))
    })
    return () => {
      canceled = true
    }
  }, [instructionOpen])

  // Close instruction panel when feature is disabled
  useEffect(() => {
    if (enabled || !instructionOpen) {
      return
    }
    let canceled = false
    queueMicrotask(() => {
      if (canceled) return
      closeInstruction()
    })
    return () => {
      canceled = true
    }
  }, [enabled, instructionOpen, closeInstruction])

  useClickOutside(
    [instructionBtnRef, instructionAddBtnRef, instructionPanelRef],
    closeInstruction,
    instructionOpen,
  )

  // Close instruction panel on Escape key
  useEffect(() => {
    if (!instructionOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeInstruction()
        instructionBtnRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [instructionOpen, closeInstruction])

  return {
    instructionLibrary,
    isLoading,
    instructionOpen,
    showInstructionForm,
    instructionListHeight,
    newInstruction,
    validationError,
    loadError,
    operationError,
    deletingInstructionKey,
    isCreatingInstruction,
    instructionBtnRef,
    instructionAddBtnRef,
    instructionPanelRef,
    toggleInstruction,
    closeInstruction,
    toggleInstructionForm,
    setNewInstruction,
    handleInstructionSelect,
    handleInstructionDelete,
    handleInstructionCreate,
    handleInstructionCancel,
    reloadInstructions,
    startInstructionResize,
    handleInstructionResizeKeyDown,
  }
}
