import { type FC } from 'react'

import type { ChatTabKey, Theme } from '../../types'

interface EmptyChatStateProps {
  chatTab: ChatTabKey
  onSuggestionClick: (text: string) => void
  theme: Theme
}

const SUGGESTIONS: Record<ChatTabKey, string[]> = {
  focus: [
    '帮我提出对以下权利要求书的优化建议',
    '帮我提出对以下具体实施方式的优化建议',
    '帮我提出对以下附图说明的优化建议',
    '帮我提出对以下专利名称的优化建议',
  ],
  image: [
    '生成一张流程示意图',
    '创建技术架构的示意图',
    '描述一个产品外观的概念图',
    '根据专利附图说明修改以下专利附图',
  ],
  general: [
    '帮我提供一些建议',
    '帮我详细的解释这个技术',
    '中国专利申请流程是怎样的',
    'PCT专利申请流程是怎样的',
  ],
}

const SUBTITLES: Record<ChatTabKey, string> = {
  focus: '使用指令库模板，快速生成权利要求书、背景技术等专利章节。',
  image: '描述专利附图需求，助手将整理语义提示词辅助生图。',
  general: '上传技术交底书，助手可辅助撰写专利说明书各章节。',
}

export const EmptyChatState: FC<EmptyChatStateProps> = ({ chatTab, onSuggestionClick, theme }) => {
  const suggestions = SUGGESTIONS[chatTab]
  const subtitle = SUBTITLES[chatTab]
  const themeTextColor = theme.primaryText ?? theme.primary

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 h-full">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: `${theme.primary}14` }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={themeTextColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">开始对话</h3>
      <p className="text-xs text-gray-500 mb-2 text-center max-w-[240px]">{subtitle}</p>
      <p className="mb-6 max-w-[280px] text-center text-[11px] leading-relaxed text-gray-500">
        指令会插入到输入框开头，读取资料会追加到末尾。
      </p>
      <ol className="w-full max-w-[340px] list-decimal space-y-2.5 pl-5 text-xs leading-relaxed text-gray-700 marker:text-gray-500">
        {suggestions.map((text) => (
          <li key={text} className="pl-1">
            <button
              type="button"
              className="group min-h-10 w-full touch-manipulation rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-xs leading-relaxed text-gray-700 shadow-sm transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-emerald-200 hover:bg-emerald-50 hover:text-gray-900 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 motion-reduce:transition-none"
              aria-label={`插入到输入框开头：${text}`}
              onClick={() => onSuggestionClick(text)}
            >
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 break-words">{text}</span>
                <span
                  aria-hidden="true"
                  data-testid="empty-suggestion-fill-icon"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors group-hover:border-emerald-200 group-hover:bg-white group-hover:text-emerald-600 motion-reduce:transition-none"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    focusable="false"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

EmptyChatState.displayName = 'EmptyChatState'
