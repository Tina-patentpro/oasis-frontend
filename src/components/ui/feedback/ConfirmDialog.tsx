import { motion } from '@/components/ui/motion'
import { memo, useId, useRef } from 'react'

import { AccessibleDialog } from './AccessibleDialog'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

export const ConfirmDialog = memo<ConfirmDialogProps>(
  ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = '确认',
    cancelText = '取消',
    danger = false,
  }) => {
    const cancelButtonRef = useRef<HTMLButtonElement>(null)
    const titleId = useId()
    const descriptionId = useId()

    return (
      <AccessibleDialog
        isOpen={isOpen}
        onClose={onCancel}
        labelledBy={titleId}
        describedBy={descriptionId}
        initialFocusRef={cancelButtonRef}
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 relative"
      >
        <h2 id={titleId} className="text-xl font-bold text-gray-900 mb-2">
          {title}
        </h2>
        <p id={descriptionId} className="text-gray-600 mb-6">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <motion.button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            ref={cancelButtonRef}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {cancelText}
          </motion.button>
          <motion.button
            onClick={onConfirm}
            className={`px-3 py-2 rounded-lg text-white transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {confirmText}
          </motion.button>
        </div>
      </AccessibleDialog>
    )
  },
)

ConfirmDialog.displayName = 'ConfirmDialog'
