import { useMemo, useRef, useState, type CSSProperties } from 'react'

import { useClickOutside } from '../../../hooks/useClickOutside'
import { ActionBtn, Tooltip } from '../../ui'
import { useRenderModeMenuKeyboard } from './render-mode-menu-keyboard'

type RenderMode = 'rich' | 'source'

interface GenerationStatusMeta {
  label: string
  className: string
}

interface OutputSectionHeaderProps {
  generationStatusMeta: GenerationStatusMeta
  renderMode: RenderMode
  onRenderModeChange: (mode: RenderMode) => void
  onGenerate: () => void
  onCopy: () => void
  onDownload: () => void
  onNextStep: () => void
  generateDisabled: boolean
  isGenerating: boolean
  themeColor: string
  themeHover: string
  themePrimary: string
  themeBorder: string
  themeSoft: string
  themeShadow: string
  generateTooltip: string
  hasText: boolean
  downloadDisabled: boolean
  downloadTooltip: string
  downloadableCount: number
}

export function OutputSectionHeader({
  generationStatusMeta,
  renderMode,
  onRenderModeChange,
  onGenerate,
  onCopy,
  onDownload,
  onNextStep,
  generateDisabled,
  isGenerating,
  themeColor,
  themeHover,
  themePrimary,
  themeBorder,
  themeSoft,
  themeShadow,
  generateTooltip,
  hasText,
  downloadDisabled,
  downloadTooltip,
  downloadableCount,
}: OutputSectionHeaderProps) {
  const renderMenuBtnRef = useRef<HTMLButtonElement>(null)
  const renderMenuRef = useRef<HTMLDivElement>(null)
  const [renderMenuOpen, setRenderMenuOpen] = useState(false)
  const renderMenuId = 'output-render-mode-menu'
  const handleRenderMenuKeyDown = useRenderModeMenuKeyboard({
    open: renderMenuOpen,
    menuRef: renderMenuRef,
    buttonRef: renderMenuBtnRef,
    onClose: () => setRenderMenuOpen(false),
  })

  useClickOutside([renderMenuBtnRef, renderMenuRef], () => setRenderMenuOpen(false), renderMenuOpen)

  const downloadBadgeStyle: CSSProperties = useMemo(
    () => ({
      backgroundColor: themePrimary,
      color: '#ffffff',
      boxShadow: `0 0 0 2px #ffffff`,
    }),
    [themePrimary],
  )

  const renderToggleStyle = {
    '--chat-btn-bg': '#ffffff',
    '--chat-btn-color': '#374151',
    '--chat-btn-border': `1px solid ${themeBorder}`,
    '--chat-btn-hover-bg': themeSoft,
    '--chat-btn-hover-color': themePrimary,
    '--chat-btn-hover-shadow': themeShadow,
    '--chat-btn-press-bg': `${themePrimary}26`,
    '--chat-btn-focus-ring': themePrimary,
    '--chat-btn-hover-translate': '-1px',
  } as CSSProperties

  return (
    <div className="sticky top-0 z-20 bg-white shadow-sm">
      <div className="py-3 border-b border-gray-200">
        <div className="output-preview-header">
          <div className="output-preview-header__lead">
            <div className="output-preview-header__title text-sm font-semibold text-gray-700">
              生成结果预览
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${generationStatusMeta.className}`}
            >
              {generationStatusMeta.label}
            </span>

            <div className="output-preview-header__mode">
              <Tooltip content="切换生成结果的呈现方式">
                <button
                  ref={renderMenuBtnRef}
                  onClick={() => setRenderMenuOpen(!renderMenuOpen)}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={renderMenuOpen}
                  aria-controls={renderMenuOpen ? renderMenuId : undefined}
                  className="chat-action-btn inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white text-xs font-medium text-gray-700 transition-colors focus:outline-none min-w-[90px] max-w-[90px] justify-between"
                  style={renderToggleStyle}
                >
                  {renderMode === 'rich' ? '富文本' : '源码'}
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-500"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </Tooltip>
              {renderMenuOpen && (
                <div
                  id={renderMenuId}
                  ref={renderMenuRef}
                  role="menu"
                  aria-label="选择生成结果呈现方式"
                  onKeyDown={handleRenderMenuKeyDown}
                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden text-sm z-20 w-32"
                >
                  <Tooltip content="以排版后的富文本查看生成内容" position="right" align="start">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={renderMode === 'rich'}
                      aria-label="富文本"
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                      onClick={() => {
                        onRenderModeChange('rich')
                        setRenderMenuOpen(false)
                      }}
                    >
                      {renderMode === 'rich' && (
                        <span className="text-[var(--theme-primary)]">✓</span>
                      )}
                      <span
                        className={
                          renderMode === 'rich' ? 'text-[var(--theme-primary)] font-medium' : ''
                        }
                      >
                        富文本
                      </span>
                    </button>
                  </Tooltip>
                  <Tooltip content="以源码视图查看生成内容" position="right" align="start">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={renderMode === 'source'}
                      aria-label="源码"
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                      onClick={() => {
                        onRenderModeChange('source')
                        setRenderMenuOpen(false)
                      }}
                    >
                      {renderMode === 'source' && (
                        <span className="text-[var(--theme-primary)]">✓</span>
                      )}
                      <span
                        className={
                          renderMode === 'source' ? 'text-[var(--theme-primary)] font-medium' : ''
                        }
                      >
                        源码
                      </span>
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>

          <div className="output-preview-header__actions">
            <ActionBtn
              onClick={onGenerate}
              primary
              disabled={generateDisabled}
              loading={isGenerating}
              ariaLabel="生成内容"
              themeColor={themeColor}
              themeHoverColor={themeHover}
              tooltip={generateTooltip}
              tooltipPosition="bottom"
              className="w-full justify-center"
            >
              ✨ 生成
            </ActionBtn>
            <ActionBtn
              onClick={onCopy}
              disabled={!hasText}
              ariaLabel="复制生成内容"
              tooltip="复制生成结果到剪贴板"
              tooltipPosition="bottom"
              className="w-full justify-center"
            >
              复制文本
            </ActionBtn>
            <div className="relative inline-flex w-full">
              <ActionBtn
                onClick={onDownload}
                disabled={downloadDisabled}
                ariaLabel="下载文件"
                tooltip={downloadTooltip}
                tooltipPosition="bottom"
                className="w-full justify-center"
              >
                {downloadableCount > 0 ? `下载 (${downloadableCount})` : '下载'}
              </ActionBtn>
              {downloadableCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center"
                  style={downloadBadgeStyle}
                >
                  {downloadableCount}
                </span>
              )}
            </div>
            <ActionBtn
              onClick={onNextStep}
              disabled={!hasText}
              ariaLabel="下一步"
              tooltip="切换到下一个步骤"
              tooltipPosition="bottom"
              className="w-full justify-center"
            >
              下一步 →
            </ActionBtn>
          </div>
        </div>
      </div>
    </div>
  )
}
