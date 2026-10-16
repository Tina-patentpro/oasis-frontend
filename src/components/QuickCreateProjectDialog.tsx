import { useRef, useState, type KeyboardEvent } from 'react'

import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'

interface QuickCreateProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (projectName: string, customerName: string) => void | Promise<void>
  themeColor: string
}

export const QuickCreateProjectDialog = ({
  isOpen,
  onClose,
  onConfirm,
  themeColor,
}: QuickCreateProjectDialogProps) => {
  const [projectName, setProjectName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [nameError, setNameError] = useState('')
  const [customerError, setCustomerError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const customerInputRef = useRef<HTMLInputElement | null>(null)

  const resetForm = () => {
    setProjectName('')
    setCustomerName('')
    setNameError('')
    setCustomerError('')
    setSubmitError('')
  }

  const handleConfirm = async () => {
    if (isSubmitting) {
      return
    }

    const trimmedName = projectName.trim()
    const trimmedCustomer = customerName.trim()
    setSubmitError('')

    if (!trimmedName) {
      setNameError('项目名称不能为空')
      queueMicrotask(() => nameInputRef.current?.focus())
      return
    }
    if (trimmedName.length < 2) {
      setNameError('项目名称至少需要 2 个字符')
      queueMicrotask(() => nameInputRef.current?.focus())
      return
    }
    if (trimmedName.length > 50) {
      setNameError('项目名称不能超过 50 个字符')
      queueMicrotask(() => nameInputRef.current?.focus())
      return
    }

    if (!trimmedCustomer) {
      setCustomerError('客户名称不能为空')
      queueMicrotask(() => customerInputRef.current?.focus())
      return
    }
    if (trimmedCustomer.length > 50) {
      setCustomerError('客户名称不能超过 50 个字符')
      queueMicrotask(() => customerInputRef.current?.focus())
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(trimmedName, trimmedCustomer)
      resetForm()
      onClose()
    } catch (error) {
      console.error('[QuickCreateProjectDialog] 创建项目失败:', error)
      setSubmitError('创建项目失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (isSubmitting) {
      return
    }

    resetForm()
    onClose()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      void handleConfirm()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={handleCancel}
      labelledBy="quick-create-project-title"
      initialFocusRef={nameInputRef}
      className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
    >
      <div onKeyDown={handleKeyDown}>
        <h2 id="quick-create-project-title" className="mb-4 text-xl font-bold text-gray-900">
          快速创建项目
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="quick-project-name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              项目名称 <span className="text-red-500">*</span>
            </label>
            <input
              id="quick-project-name"
              ref={nameInputRef}
              type="text"
              value={projectName}
              placeholder="例如：智能机器人导航系统"
              disabled={isSubmitting}
              aria-invalid={nameError ? 'true' : undefined}
              aria-describedby={nameError ? 'quick-project-name-error' : undefined}
              onChange={(event) => {
                setProjectName(event.target.value)
                setNameError('')
              }}
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 transition-colors ${
                nameError
                  ? 'border-red-300 focus:ring-red-400'
                  : 'border-gray-300 focus:ring-emerald-400'
              } disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500`}
            />
            {nameError && (
              <p id="quick-project-name-error" role="alert" className="mt-1 text-sm text-red-600">
                {nameError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="quick-project-customer"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              客户 <span className="text-red-500">*</span>
            </label>
            <input
              id="quick-project-customer"
              ref={customerInputRef}
              type="text"
              value={customerName}
              placeholder="例如：星矩机器人"
              disabled={isSubmitting}
              aria-invalid={customerError ? 'true' : undefined}
              aria-describedby={customerError ? 'quick-project-customer-error' : undefined}
              onChange={(event) => {
                setCustomerName(event.target.value)
                setCustomerError('')
              }}
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 transition-colors ${
                customerError
                  ? 'border-red-300 focus:ring-red-400'
                  : 'border-gray-300 focus:ring-emerald-400'
              } disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500`}
            />
            {customerError && (
              <p
                id="quick-project-customer-error"
                role="alert"
                className="mt-1 text-sm text-red-600"
              >
                {customerError}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <p className="mb-1 font-medium">💡 提示</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>项目创建后会自动关联到当前工作区</li>
              <li>可以在项目列表中查看和编辑项目详情</li>
              <li>快捷键：Ctrl/Cmd + Enter 确认创建</li>
            </ul>
          </div>

          {submitError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {submitError}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="rounded-lg px-4 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: themeColor }}
          >
            {isSubmitting ? '创建中…' : '创建项目'}
          </button>
        </div>
      </div>
    </AccessibleDialog>
  )
}
