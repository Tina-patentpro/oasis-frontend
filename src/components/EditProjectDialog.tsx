/**
 * 编辑项目对话框 - 支持动态字段配置
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

import { PROJECT_FIELD_GROUPS } from '@/constants/projectFields'
import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'
import {
  useConversationSettingsStore,
  DEFAULT_CUSTOMER_LEVELS,
  DEFAULT_COOPERATION_TYPES,
  DEFAULT_PROJECT_STAGES,
  DEFAULT_PROJECT_STATUSES,
} from '@/modules/workspace/stores'
import type { Project, ProjectFieldConfig } from '@/types/api'

type ProjectMetadata = Record<string, string>
type EditProjectErrorField = 'name' | `metadata.${string}`

interface EditProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onSave: (
    id: number,
    data: { name: string; description?: string; metadata?: ProjectMetadata },
  ) => Promise<void>
  themeColor?: string
}

export const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
  themeColor = '#3b82f6',
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formData, setFormData] = useState<ProjectMetadata>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<EditProjectErrorField | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const customerLevels = useConversationSettingsStore((state) => state.customerLevels)
  const cooperationTypes = useConversationSettingsStore((state) => state.cooperationTypes)
  const projectStages = useConversationSettingsStore((state) => state.projectStages)
  const projectStatuses = useConversationSettingsStore((state) => state.projectStatuses)

  const selectOptionsMap = useMemo(
    () => ({
      customerLevel: customerLevels.length > 0 ? customerLevels : DEFAULT_CUSTOMER_LEVELS,
      cooperationType: cooperationTypes.length > 0 ? cooperationTypes : DEFAULT_COOPERATION_TYPES,
      projectStatus: projectStages.length > 0 ? projectStages : DEFAULT_PROJECT_STAGES,
      projectPhase: projectStatuses.length > 0 ? projectStatuses : DEFAULT_PROJECT_STATUSES,
    }),
    [customerLevels, cooperationTypes, projectStages, projectStatuses],
  )

  // 当项目改变时更新表单
  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
      const normalizedMetadata = Object.entries(project.metadata ?? {}).reduce<ProjectMetadata>(
        (acc, [key, value]) => {
          acc[key] = value === undefined || value === null ? '' : String(value)
          return acc
        },
        {},
      )
      setFormData(normalizedMetadata)
    }
  }, [project])

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isOpen])

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('项目名称不能为空')
      setErrorField('name')
      return false
    }

    // 验证必填字段
    const allFields = PROJECT_FIELD_GROUPS.flatMap((group) => group.fields)
    const requiredFields = allFields.filter((field) => field.required)

    for (const field of requiredFields) {
      const value = formData[field.key]
      if (typeof value !== 'string' || value.trim() === '') {
        setError(`${field.label}不能为空`)
        setErrorField(`metadata.${field.key}`)
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!project) return
    if (!validateForm()) return

    setIsLoading(true)
    setError(null)
    setErrorField(null)

    try {
      await onSave(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        metadata: formData,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setErrorField(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setError(null)
      setErrorField(null)
      onClose()
    }
  }

  const renderField = (field: ProjectFieldConfig) => {
    const value = formData[field.key] || ''
    const fieldId = `project-field-${field.key}`
    const fieldError = errorField === `metadata.${field.key}`
    const sharedFieldProps = {
      id: fieldId,
      'aria-invalid': fieldError ? true : undefined,
      'aria-describedby': fieldError ? 'edit-project-error' : undefined,
    }

    switch (field.type) {
      case 'text':
        return (
          <input
            {...sharedFieldProps}
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors text-sm"
            style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
            disabled={isLoading}
          />
        )

      case 'textarea':
        return (
          <textarea
            {...sharedFieldProps}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors resize-none text-sm"
            style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
            disabled={isLoading}
          />
        )

      case 'number':
        return (
          <input
            {...sharedFieldProps}
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors text-sm"
            style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
            disabled={isLoading}
          />
        )

      case 'date':
        return (
          <input
            {...sharedFieldProps}
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors text-sm"
            style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
            disabled={isLoading}
          />
        )

      case 'datetime':
        return (
          <input
            {...sharedFieldProps}
            type="datetime-local"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors text-sm"
            style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
            disabled={isLoading}
          />
        )

      case 'select':
        return (
          <select
            {...sharedFieldProps}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors text-sm bg-white"
            style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
            disabled={isLoading}
          >
            <option value="">{field.placeholder || '请选择'}</option>
            {(
              selectOptionsMap[field.key as keyof typeof selectOptionsMap] ||
              field.options ||
              []
            ).map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      default:
        return null
    }
  }

  if (!isOpen || !project) return null

  const isNameError = errorField === 'name'

  const dialogContent = (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={handleClose}
      labelledBy="edit-project-title"
      describedBy="edit-project-desc"
      initialFocusRef={nameInputRef}
      zIndexClassName="z-[60]"
      className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
    >
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <h2 id="edit-project-title" className="text-lg font-semibold text-gray-900">
          编辑项目
        </h2>
        <p id="edit-project-desc" className="mt-1 text-sm text-gray-500">
          修改项目的基本信息、客户信息和其他配置
        </p>
      </div>

      {/* 表单内容 - 可滚动 */}
      <div className="flex-1 overflow-y-auto">
        <form id="edit-project-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* 基本信息（固定） */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200">
              项目基本信息
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="project-name"
                >
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入项目名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors text-sm"
                  style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                  disabled={isLoading}
                  id="project-name"
                  ref={nameInputRef}
                  aria-invalid={isNameError ? 'true' : undefined}
                  aria-describedby={isNameError ? 'edit-project-error' : undefined}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="project-description"
                >
                  项目描述
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请输入项目描述"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors text-sm"
                  style={{ '--tw-ring-color': themeColor } as React.CSSProperties}
                  disabled={isLoading}
                  id="project-description"
                />
              </div>
            </div>
          </div>

          {/* 动态字段组 */}
          {PROJECT_FIELD_GROUPS.map((group) => (
            <div key={group.category} className="space-y-4">
              <h3
                className="text-sm font-semibold pb-2 border-b flex items-center gap-2"
                style={{
                  color: group.textColor,
                  borderColor: group.borderColor,
                }}
              >
                {group.label}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.fields.map((field) => (
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label
                      className="block text-sm font-medium text-gray-700 mb-1"
                      htmlFor={`project-field-${field.key}`}
                    >
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 错误提示 */}
          {error && (
            <div
              id="edit-project-error"
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 px-4 py-3"
            >
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </form>
      </div>

      {/* 底部按钮 - 固定 */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={handleClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          form="edit-project-form"
          disabled={isLoading || !name.trim()}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{
            backgroundColor: themeColor,
            opacity: isLoading || !name.trim() ? 0.5 : 1,
          }}
        >
          {isLoading ? '保存中…' : '保存'}
        </button>
      </div>
    </AccessibleDialog>
  )

  return createPortal(dialogContent, document.body)
}
