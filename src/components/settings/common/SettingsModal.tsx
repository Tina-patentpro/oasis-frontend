import React from 'react'

import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'

interface SettingsModalProps {
  isOpen: boolean
  onRequestClose: () => void
  children: React.ReactNode
  containerClassName?: string
  label?: string
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onRequestClose,
  children,
  containerClassName,
  label = '设置弹窗',
}) => (
  <AccessibleDialog
    isOpen={isOpen}
    onClose={onRequestClose}
    label={label}
    zIndexClassName="z-[120]"
    overlayClassName="bg-black/40"
    className={`relative z-[121] rounded-2xl bg-white p-6 shadow-2xl ${containerClassName ?? ''}`}
  >
    {children}
  </AccessibleDialog>
)

SettingsModal.displayName = 'SettingsModal'
