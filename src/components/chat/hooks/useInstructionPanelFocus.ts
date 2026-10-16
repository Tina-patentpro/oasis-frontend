import { useCallback, useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'

const FOCUSABLE_PANEL_SELECTOR =
  'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

interface UseInstructionPanelFocusOptions {
  instructionOpen: boolean
  instructionPanelRef: RefObject<HTMLDivElement | null>
  instructionBtnRef: RefObject<HTMLButtonElement | null>
  toggleInstruction: () => void
}

export function useInstructionPanelFocus({
  instructionOpen,
  instructionPanelRef,
  instructionBtnRef,
  toggleInstruction,
}: UseInstructionPanelFocusOptions) {
  const wasInstructionOpenRef = useRef(false)

  useEffect(() => {
    if (instructionOpen && !wasInstructionOpenRef.current) {
      instructionPanelRef.current?.querySelector<HTMLElement>(FOCUSABLE_PANEL_SELECTOR)?.focus()
    }
    wasInstructionOpenRef.current = instructionOpen
  }, [instructionOpen, instructionPanelRef])

  return useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        toggleInstruction()
        instructionBtnRef.current?.focus()
      }
    },
    [instructionBtnRef, toggleInstruction],
  )
}
