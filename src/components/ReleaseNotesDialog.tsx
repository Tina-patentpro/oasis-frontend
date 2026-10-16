import React, { useEffect, useId, useMemo, useState } from 'react'

import { APP_VERSION_LABEL } from '@/constants/appMeta'
import { ContentRenderer } from './ContentRenderer'
import { AccessibleDialog } from './ui/feedback/AccessibleDialog'

interface ReleaseNotesDialogProps {
  isOpen: boolean
  onClose: () => void
  themeColor: string
}

const RELEASE_NOTES_URL = '/help/release-notes.md'

export const ReleaseNotesDialog: React.FC<ReleaseNotesDialogProps> = ({
  isOpen,
  onClose,
  themeColor,
}) => {
  const [markdown, setMarkdown] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let isMounted = true

    const loadReleaseNotes = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(
          `${RELEASE_NOTES_URL}?v=${encodeURIComponent(APP_VERSION_LABEL)}`,
        )
        if (!response.ok) {
          throw new Error(`版本更新加载失败（状态码：${response.status}）`)
        }

        const text = await response.text()
        if (!isMounted) {
          return
        }

        setMarkdown(text)
      } catch (err) {
        if (!isMounted) {
          return
        }

        const message = err instanceof Error ? err.message : '版本更新加载失败'
        setError(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadReleaseNotes()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  const bodyContent = useMemo(() => {
    if (isLoading) {
      return <p className="text-sm text-gray-500">正在加载版本更新，请稍候…</p>
    }

    if (error) {
      return (
        <div
          className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600"
          role="alert"
        >
          {error}
        </div>
      )
    }

    return <ContentRenderer content={markdown} />
  }, [error, isLoading, markdown])

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
    >
      <div className="border-b bg-gray-50 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h2 id={titleId} className="text-xl font-bold text-gray-900">
                版本更新
              </h2>
              <span
                className="rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: themeColor }}
              >
                当前版本 {APP_VERSION_LABEL}
              </span>
            </div>
            <p id={descriptionId} className="text-sm text-gray-500">
              这里按版本倒序展示每次发布新增了什么、优化了什么、修复了什么。
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200"
            aria-label="关闭版本更新"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-6 py-6">{bodyContent}</div>
    </AccessibleDialog>
  )
}
