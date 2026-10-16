import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'

import type { LayoutMode } from '@/types/workspace'

interface WorkspaceShortcutHandlers {
  generate: () => void
  copyInput: () => void
  undoInputs: () => void
  setLayoutMode: (mode: LayoutMode) => void
}

export function useWorkspaceShortcuts({
  generate,
  copyInput,
  undoInputs,
  setLayoutMode,
}: WorkspaceShortcutHandlers): void {
  useKeyboardShortcut('Enter', generate, { ctrl: true })
  useKeyboardShortcut('c', copyInput, { ctrl: true, shift: true })
  useKeyboardShortcut('z', undoInputs, { ctrl: true })

  // Layout shortcuts: Alt + 1/2/3 for auto/vertical/contrast
  useKeyboardShortcut('1', () => setLayoutMode('auto'), { alt: true })
  useKeyboardShortcut('2', () => setLayoutMode('vertical'), { alt: true })
  useKeyboardShortcut('3', () => setLayoutMode('contrast'), { alt: true })
}
