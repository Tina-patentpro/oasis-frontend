import { useId, type FC } from 'react'

import {
  SUPPORTED_DOCUMENT_FORMAT_LABEL,
  SUPPORTED_IMAGE_FORMAT_LABEL,
} from '@/config/attachmentFormats'
import { Tooltip } from '../../ui'

import type { InputSectionActionsProps } from './types'

export const InputSectionActions: FC<InputSectionActionsProps> = ({
  canTriggerReadAction,
  onTriggerReadAction,
  readActionLabel,
  readActionTooltip,
  onCopyInput,
  onClearAll,
  appliedLayout,
  baseActionStyle,
}) => {
  const readActionTooltipId = useId()

  return (
    <>
      <div
        className={
          'flex items-center justify-between text-xs text-gray-600 relative ' +
          (appliedLayout === 'contrast' ? 'flex-shrink-0' : '')
        }
      >
        <div className="ml-1 flex items-center gap-2">
          {readActionTooltip && (
            <span id={readActionTooltipId} className="sr-only">
              {readActionTooltip}
            </span>
          )}
          <Tooltip content={readActionTooltip}>
            <button
              type="button"
              className="chat-action-btn px-3 py-1.5 rounded-full text-xs"
              style={{
                ...baseActionStyle,
                opacity: canTriggerReadAction ? 1 : 0.45,
                cursor: canTriggerReadAction ? 'pointer' : 'not-allowed',
              }}
              onClick={onTriggerReadAction}
              disabled={!canTriggerReadAction}
              aria-describedby={readActionTooltip ? readActionTooltipId : undefined}
            >
              {readActionLabel}
            </button>
          </Tooltip>
          <Tooltip
            content={
              <div>
                <div>复制当前输入框中的所有文本内容</div>
                <div className="text-xs opacity-80 mt-1">快捷键: Ctrl + Shift + C</div>
              </div>
            }
          >
            <button
              type="button"
              className="chat-action-btn px-3 py-1.5 rounded-full text-xs"
              style={baseActionStyle}
              onClick={onCopyInput}
            >
              复制文本
            </button>
          </Tooltip>
          <Tooltip
            content={
              <div>
                <div>清空当前输入框中的所有内容</div>
                <div className="text-xs opacity-80 mt-1">快捷键: Ctrl + Shift + X</div>
              </div>
            }
          >
            <button
              type="button"
              className="chat-action-btn px-3 py-1.5 rounded-full text-xs"
              style={baseActionStyle}
              onClick={onClearAll}
            >
              清空
            </button>
          </Tooltip>
        </div>
      </div>

      {appliedLayout !== 'contrast' && (
        <div className="grid gap-2 text-xs text-gray-500 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">
              快捷操作
            </div>
            <div className="mt-2 space-y-1 leading-5">
              <div>
                <span className="font-medium text-gray-700">生成：</span>
                Ctrl/Command + Enter
              </div>
              <div>
                <span className="font-medium text-gray-700">复制：</span>
                Ctrl/Command + Shift + C
              </div>
              <div>
                <span className="font-medium text-gray-700">撤销：</span>
                Ctrl/Command + Z
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">
              生成提醒
            </div>
            <div className="mt-2 space-y-1 leading-5">
              <div>生成过程中，“生成”按钮会暂时变灰，避免重复点击。</div>
              <div>同步任务完成后，会在当前会话里恢复可用。</div>
              <div>异步任务请先点击“新会话”，再开始下一轮生成。</div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">
              支持格式
            </div>
            <div className="mt-2 space-y-1 leading-5">
              <div>
                <span className="font-medium text-gray-700">文档：</span>
                {SUPPORTED_DOCUMENT_FORMAT_LABEL}
              </div>
              <div>
                <span className="font-medium text-gray-700">图片：</span>
                {SUPPORTED_IMAGE_FORMAT_LABEL}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
