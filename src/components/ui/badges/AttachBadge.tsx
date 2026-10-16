import { memo } from 'react'

import type { Attachment, Theme } from '../../../types'

interface AttachBadgeProps {
  att: Attachment
  onRemove: (id: string) => void
  theme: Theme
  removeDisabled?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const AttachBadge = memo<AttachBadgeProps>(
  ({ att, onRemove, theme, removeDisabled = false }) => (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs"
      style={{
        backgroundColor: `${theme.primary}14`,
        borderColor: `${theme.primary}26`,
        color: theme.primaryText ?? theme.primary,
      }}
    >
      <span role="img" aria-label={att.type === 'image' ? '图片' : '文件'}>
        {att.type === 'image' ? '🖼' : '📄'}
      </span>
      <span className="max-w-[140px] truncate" title={att.name}>
        {att.name}
        {att.size > 0 && ` (${formatFileSize(att.size)})`}
      </span>
      <button
        type="button"
        className="inline-flex min-h-8 min-w-8 items-center justify-center rounded opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
        onClick={() => {
          if (!removeDisabled) {
            onRemove(att.id)
          }
        }}
        aria-label={removeDisabled ? `生成中暂不能移除 ${att.name}` : `移除 ${att.name}`}
        disabled={removeDisabled}
        title={removeDisabled ? '生成中暂不能移除附件' : undefined}
      >
        ✕
      </button>
    </div>
  ),
  (prev, next) =>
    prev.att.id === next.att.id &&
    prev.att.name === next.att.name &&
    prev.att.size === next.att.size &&
    prev.att.type === next.att.type &&
    prev.theme?.primary === next.theme?.primary &&
    prev.theme?.primaryText === next.theme?.primaryText &&
    prev.onRemove === next.onRemove &&
    prev.removeDisabled === next.removeDisabled,
)

AttachBadge.displayName = 'AttachBadge'
