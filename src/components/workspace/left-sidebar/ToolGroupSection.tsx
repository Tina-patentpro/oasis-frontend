import {
  type FC,
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { useAsyncToolStore, useThemeStore } from '@/stores'
import { Tooltip } from '../../ui'
import type { ToolGroupSectionProps } from './types'

/** Unified themed pill badge */
const Pill: FC<{ primary: string; children: React.ReactNode; title?: string }> = ({
  primary,
  children,
  title,
}) => {
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: '2px 7px',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.02em',
    userSelect: 'none',
    flexShrink: 0,
    color: primary,
    background: `${primary}15`,
    border: `1px solid ${primary}38`,
    boxShadow: `0 0 6px ${primary}1e`,
    whiteSpace: 'nowrap',
  }
  return (
    <span style={style} title={title}>
      {children}
    </span>
  )
}

/** Custom model version selector that supports per-version async badges */
const ModelSelector: FC<{
  versions: Array<{ id: string; name: string; description?: string; apiEndpoint?: string }>
  value: string
  asyncEndpointMap: Record<string, boolean>
  primary: string
  onChange: (id: string) => void
}> = ({ versions, value, asyncEndpointMap, primary, onChange }) => {
  const [open, setOpen] = useState(false)
  const listboxId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = versions.find((v) => v.id === value) ?? versions[0]
  const selectedIndex = Math.max(
    0,
    versions.findIndex((version) => version.id === selected?.id),
  )
  // Only show the badge if the SELECTED version's endpoint is strictly async
  const selectedIsAsync =
    selected?.apiEndpoint != null && asyncEndpointMap[selected.apiEndpoint] === true

  const focusOption = useCallback((index: number) => {
    const options = Array.from(
      listboxRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    )
    options[index]?.focus()
  }, [])

  const openAndFocusOption = useCallback(
    (index: number) => {
      setOpen(true)
      window.setTimeout(() => focusOption(index), 0)
    },
    [focusOption],
  )

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        openAndFocusOption(selectedIndex)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        openAndFocusOption(versions.length - 1)
      }
    },
    [openAndFocusOption, selectedIndex, versions.length],
  )

  const handleListboxKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const options = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'),
      )
      const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement)
      const focusNext = (nextIndex: number) => {
        event.preventDefault()
        options[nextIndex]?.focus()
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      } else if (event.key === 'ArrowDown' && options.length > 0) {
        focusNext(currentIndex >= 0 ? (currentIndex + 1) % options.length : selectedIndex)
      } else if (event.key === 'ArrowUp' && options.length > 0) {
        focusNext(currentIndex >= 0 ? (currentIndex - 1 + options.length) % options.length : 0)
      } else if (event.key === 'Home' && options.length > 0) {
        focusNext(0)
      } else if (event.key === 'End' && options.length > 0) {
        focusNext(options.length - 1)
      }
    },
    [selectedIndex],
  )

  return (
    <div ref={rootRef} className="relative w-full">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        className="w-full flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
      >
        {/* Left: model name */}
        <span className="truncate text-gray-800 font-medium flex-1 text-left">
          {selected?.name ?? '—'}
        </span>

        {/* Right: async badge (only for selected version, only if truly async) + chevron */}
        <span className="flex items-center gap-2 shrink-0">
          {selectedIsAsync && (
            <Pill primary={primary} title="异步后台执行">
              <span style={{ fontSize: '11px', lineHeight: 1 }}>⚡</span>
              异步
            </Pill>
          )}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          aria-label="选择模型版本"
          onKeyDown={handleListboxKeyDown}
          className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {versions.map((v) => {
            const isSelected = v.id === value
            // Strictly check this version's own endpoint
            const vIsAsync = v.apiEndpoint != null && asyncEndpointMap[v.apiEndpoint] === true

            return (
              <button
                key={v.id}
                role="option"
                aria-selected={isSelected}
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-gray-50"
                style={isSelected ? { background: `${primary}0a` } : undefined}
                onClick={() => {
                  onChange(v.id)
                  setOpen(false)
                }}
              >
                {/* Left: model name */}
                <span
                  className="flex-1 truncate font-medium"
                  style={isSelected ? { color: primary } : { color: '#374151' }}
                >
                  {v.name}
                </span>

                {/* Right: per-version async badge + 当前 badge */}
                <span className="flex items-center gap-1.5 shrink-0">
                  {vIsAsync && (
                    <Pill primary={primary}>
                      <span style={{ fontSize: '11px', lineHeight: 1 }}>⚡</span>
                      异步
                    </Pill>
                  )}
                  {isSelected && <Pill primary={primary}>当前</Pill>}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Tool group selection, tool list, model selection, and model info panel
 */
export const ToolGroupSection: FC<ToolGroupSectionProps> = ({
  tab,
  tabs,
  tool,
  currentTab,
  showVersionInfo,
  modelVersions,
  selectedVersionValue,
  activeToolMetadata: _activeToolMetadata,
  toolMetadataByName,
  makePillStyle,
  onTabChange,
  onToolChange,
  onToolVersionChange,
  onVersionInfoToggle,
}) => {
  // Per-endpoint async status — strictly from apidetail.is_async
  const asyncEndpointMap = useAsyncToolStore((state) => state.asyncEndpointMap)
  const primary = useThemeStore((state) => state.currentTheme.primary)
  const modelInfoPanelId = useId()

  return (
    <>
      {/* Tool Group Tabs */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500">工具组</div>
        <div className="flex gap-2">
          {tabs.length > 0 ? (
            tabs.map((item) => {
              const isActive = item.k === tab
              return (
                <button
                  key={item.k}
                  type="button"
                  className="pill-btn chat-action-btn flex-1 px-3 py-1.5 text-sm font-medium"
                  style={makePillStyle(isActive)}
                  onClick={() => onTabChange(item.k)}
                  aria-pressed={isActive}
                >
                  {item.t}
                </button>
              )
            })
          ) : (
            <div className="text-xs text-amber-600">工具组加载中或暂不可用</div>
          )}
        </div>
      </div>

      {/* Tool List */}
      <div>
        <div className="flex flex-col gap-1.5">
          {currentTab?.tools.length ? (
            currentTab.tools.map((name) => {
              const isActive = tool.name === name
              const metadata = toolMetadataByName[name]
              const toolDescription = metadata?.description ?? '点击切换到该工具'
              const defaultVersion =
                metadata?.versions?.[0]?.id ?? metadata?.versions?.[0]?.name ?? ''

              return (
                <div key={name}>
                  <Tooltip content={toolDescription} position="bottom" align="start">
                    <button
                      type="button"
                      className={
                        'w-full text-left px-3 py-2 rounded-lg border transition-[background-color,border-color,color,box-shadow,opacity,transform] text-sm ' +
                        (isActive
                          ? 'bg-theme-light border-theme-border text-theme-primary'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50')
                      }
                      onClick={() =>
                        onToolChange({
                          ...tool,
                          name,
                          ver: defaultVersion,
                        })
                      }
                    >
                      {name}
                    </button>
                  </Tooltip>
                </div>
              )
            })
          ) : (
            <div className="text-xs text-amber-600">暂无可用工具</div>
          )}
        </div>
      </div>

      {/* Model Selection */}
      {modelVersions.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-gray-500">模型</div>

          <ModelSelector
            versions={modelVersions}
            value={selectedVersionValue}
            asyncEndpointMap={asyncEndpointMap}
            primary={primary}
            onChange={onToolVersionChange}
          />

          {/* Model Info Button */}
          <button
            type="button"
            className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between"
            onClick={onVersionInfoToggle}
            aria-expanded={showVersionInfo}
            aria-controls={showVersionInfo ? modelInfoPanelId : undefined}
          >
            <span>模型说明</span>
            <svg
              className={`w-4 h-4 transition-transform ${showVersionInfo ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Model Info Panel */}
          {showVersionInfo && (
            <div
              id={modelInfoPanelId}
              className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3"
            >
              {modelVersions.map((version) => {
                const isSelected = version.id === selectedVersionValue
                // Per-version async check
                const vIsAsync =
                  version.apiEndpoint != null && asyncEndpointMap[version.apiEndpoint] === true

                return (
                  <div
                    key={version.id}
                    className={`rounded-lg border p-2.5 transition-colors ${
                      isSelected ? 'border-theme-border bg-theme-light' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-sm font-medium truncate flex-1"
                        style={isSelected ? { color: primary } : { color: '#111827' }}
                      >
                        {version.name}
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {vIsAsync && (
                          <Pill primary={primary}>
                            <span style={{ fontSize: '11px', lineHeight: 1 }}>⚡</span>
                            异步
                          </Pill>
                        )}
                        {isSelected && <Pill primary={primary}>当前</Pill>}
                      </span>
                    </div>
                    {version.description && (
                      <div className="text-xs text-gray-500 leading-relaxed">
                        {version.description}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </>
  )
}
