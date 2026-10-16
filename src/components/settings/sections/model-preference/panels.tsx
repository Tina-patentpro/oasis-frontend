import type { FC } from 'react'

import type { Tab, ToolMetadata, ToolVersion } from './types'
import { getVersionKey } from './transform'

interface GroupPanelProps {
  availableTabs: Tab[]
  currentTab?: Tab
  groupVisibility: Record<string, boolean>
  enabledGroupCount: number
  isLoading: boolean
  onSetActiveGroup: (key: string) => void
  onToggleGroup: (key: string) => void
}

export const GroupPanel: FC<GroupPanelProps> = ({
  availableTabs,
  currentTab,
  groupVisibility,
  enabledGroupCount,
  isLoading,
  onSetActiveGroup,
  onToggleGroup,
}) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h4 className="text-sm font-semibold text-gray-900">工具组</h4>
        <p className="text-xs text-gray-500 mt-1">控制左侧显示的分组与顺序</p>
      </div>
      <span className="text-xs text-gray-500">
        {enabledGroupCount}/{availableTabs.length}
      </span>
    </div>
    <div className="mt-3 space-y-2">
      {availableTabs.map((item) => {
        const isActive = item.k === currentTab?.k
        const isEnabled = groupVisibility[item.k] !== false
        return (
          <div
            key={item.k}
            className={`flex items-center justify-between rounded-lg border transition-colors ${
              isActive ? 'border-emerald-300 bg-emerald-50/70' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <button
              type="button"
              className="flex-1 rounded-l-lg px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              onClick={() => onSetActiveGroup(item.k)}
              aria-pressed={isActive}
            >
              <div className="text-sm font-medium text-gray-800">{item.t}</div>
              <div className="text-xs text-gray-500">{item.tools.length} 个工具</div>
            </button>
            <label className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600">
              <input
                aria-label={`${isEnabled ? '隐藏' : '显示'}工具组 ${item.t}`}
                type="checkbox"
                checked={isEnabled}
                onChange={() => onToggleGroup(item.k)}
              />
              <span>{isEnabled ? '显示' : '隐藏'}</span>
            </label>
          </div>
        )
      })}
      {isLoading && <div className="text-xs text-gray-500">正在加载配置…</div>}
    </div>
  </div>
)

interface ToolPanelProps {
  toolsForCurrentGroup: string[]
  enabledToolsCount: number
  activeTool: string
  toolVisibility: Record<string, boolean>
  toolMetadataByName: Record<string, ToolMetadata>
  onSetActiveTool: (toolName: string) => void
  onToggleTool: (toolName: string) => void
}

export const ToolPanel: FC<ToolPanelProps> = ({
  toolsForCurrentGroup,
  enabledToolsCount,
  activeTool,
  toolVisibility,
  toolMetadataByName,
  onSetActiveTool,
  onToggleTool,
}) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h4 className="text-sm font-semibold text-gray-900">工具</h4>
        <p className="text-xs text-gray-500 mt-1">勾选后将在左栏展示，点击行可查看对应模型</p>
      </div>
      <span className="text-xs text-gray-500">
        {enabledToolsCount}/{toolsForCurrentGroup.length}
      </span>
    </div>
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      {toolsForCurrentGroup.map((toolName) => {
        const isEnabled = toolVisibility[toolName] !== false
        const isActiveTool = toolName === activeTool
        const description = toolMetadataByName[toolName]?.description ?? '未提供描述'
        return (
          <div
            key={toolName}
            className={`rounded-lg border transition-colors ${
              isActiveTool
                ? 'border-emerald-300 bg-emerald-50/80'
                : 'border-gray-200 bg-gray-50 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="min-w-0 flex-1 rounded-tl-lg px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                onClick={() => onSetActiveTool(toolName)}
                aria-pressed={isActiveTool}
              >
                <div className="truncate text-sm font-medium text-gray-800">{toolName}</div>
              </button>
              <label className="flex items-center gap-1 px-3 py-2 text-xs text-gray-600">
                <input
                  aria-label={`${isEnabled ? '隐藏' : '显示'}工具 ${toolName}`}
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => onToggleTool(toolName)}
                />
                <span>{isEnabled ? '显示' : '隐藏'}</span>
              </label>
            </div>
            <div className="px-3 pb-2 text-[11px] text-gray-500">{description}</div>
          </div>
        )
      })}
    </div>
    {toolsForCurrentGroup.length === 0 && (
      <div className="mt-3 text-xs text-gray-500">当前分组暂无可配置的工具。</div>
    )}
  </div>
)

interface ModelPanelProps {
  modelOptions: ToolVersion[]
  visibleModels: Record<string, boolean>
  visibleModelCount: number
  allModelsSelected: boolean
  onToggleModel: (version: ToolVersion) => void
  onToggleAllModels: (visible: boolean) => void
}

export const ModelPanel: FC<ModelPanelProps> = ({
  modelOptions,
  visibleModels,
  visibleModelCount,
  allModelsSelected,
  onToggleModel,
  onToggleAllModels,
}) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h4 className="text-sm font-semibold text-gray-900">模型版本</h4>
        <p className="text-xs text-gray-500 mt-1">仅勾选的版本会出现在左栏下拉列表中</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <button
          type="button"
          className="rounded border px-2 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onToggleAllModels(true)}
          disabled={modelOptions.length === 0}
        >
          全选
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onToggleAllModels(false)}
          disabled={modelOptions.length === 0}
        >
          全部隐藏
        </button>
      </div>
    </div>
    {modelOptions.length === 0 ? (
      <div className="mt-3 text-xs text-gray-500">当前工具暂无可配置的模型。</div>
    ) : (
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {modelOptions.map((version) => {
          const key = getVersionKey(version)
          const isEnabled = visibleModels[key] !== false
          return (
            <label
              key={key}
              className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 hover:border-emerald-200 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{version.name}</div>
                <input
                  aria-label={`${isEnabled ? '隐藏' : '显示'}模型 ${version.name}`}
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => onToggleModel(version)}
                />
              </div>
              {version.description && (
                <div className="text-[11px] text-gray-500 leading-relaxed">
                  {version.description}
                </div>
              )}
            </label>
          )
        })}
      </div>
    )}
    <div className="mt-3 text-xs text-gray-500">
      已勾选 {visibleModelCount}/{modelOptions.length}，影响模型下拉展示顺序。
      {!allModelsSelected && (
        <span className="ml-1 text-emerald-600">未勾选的版本将在左栏隐藏。</span>
      )}
    </div>
  </div>
)

interface ActionsPanelProps {
  themeColor: string
  isSaving: boolean
  isLoading: boolean
  onReset: () => void
  onSave: () => void
}

export const ActionsPanel: FC<ActionsPanelProps> = ({
  themeColor,
  isSaving,
  isLoading,
  onReset,
  onSave,
}) => (
  <>
    <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
      <div>
        <div className="font-medium text-gray-900">快速恢复</div>
        <div className="text-xs text-gray-500 mt-0.5">
          重置为默认显示，所有工具组、工具与模型都会回到可见状态。
        </div>
      </div>
      <button
        type="button"
        className="rounded-lg px-3 py-2 text-sm text-white shadow transition-colors"
        style={{ backgroundColor: themeColor }}
        onClick={onReset}
      >
        恢复默认
      </button>
    </div>

    <div className="flex items-center justify-end rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3">
      <button
        type="button"
        className="rounded-lg px-6 py-2.5 text-sm font-medium text-white shadow-md transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: themeColor }}
        onClick={onSave}
        disabled={isSaving || isLoading}
      >
        {isSaving ? '保存中…' : '保存喜好设定'}
      </button>
    </div>
  </>
)
