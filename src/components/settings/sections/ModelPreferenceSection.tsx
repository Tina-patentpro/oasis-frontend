import { useCallback, useEffect, useMemo, useState, type FC } from 'react'

import { cmsService } from '@/api/services/cms.service'
import { useModelPreferenceStore } from '@/stores/useModelPreferenceStore'
import { useUIStore } from '@/stores/useUIStore'
import type { AIModel, CategoriesResponse, SubCategory } from '@/types/api'

import { SettingsSectionHeader } from '../common/SettingsSectionHeader'
import { ActionsPanel, GroupPanel, ModelPanel, ToolPanel } from './model-preference/panels'
import { getVersionKey, transformCategoriesToTabsAndMetadata } from './model-preference/transform'
import type { ModelPreferenceSectionProps, ToolVersion } from './model-preference/types'

export const ModelPreferenceSection: FC<ModelPreferenceSectionProps> = ({ themeColor }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [configData, setConfigData] = useState<CategoriesResponse | null>(null)
  const [activeGroup, setActiveGroup] = useState<string>('')
  const [activeTool, setActiveTool] = useState<string>('')

  const {
    groupVisibility,
    toolVisibility,
    modelVisibility,
    setGroupVisibility,
    setToolVisibility,
    setModelVisibility,
    setModelsForTool,
    reset,
  } = useModelPreferenceStore()

  // 获取配置数据
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true)
        const data = await cmsService.getConfigDetail()
        setConfigData(data)
      } catch (error) {
        console.error('[ModelPreferenceSection] Failed to load config:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConfig()
  }, [])

  // 转换数据
  const { tabs: availableTabs, toolMetadataByName } = useMemo(
    () => transformCategoriesToTabsAndMetadata(configData),
    [configData],
  )

  const currentTab = useMemo(
    () => availableTabs.find((item) => item.k === activeGroup) ?? availableTabs[0],
    [activeGroup, availableTabs],
  )

  useEffect(() => {
    if (availableTabs.length > 0 && !activeGroup) {
      setActiveGroup(availableTabs[0]?.k ?? '')
    }
  }, [activeGroup, availableTabs])

  useEffect(() => {
    if (!currentTab) {
      setActiveTool('')
      return
    }
    if (!activeTool || !currentTab.tools.includes(activeTool)) {
      setActiveTool(currentTab.tools[0] ?? '')
    }
  }, [activeTool, currentTab])

  const enabledGroupCount = useMemo(
    () =>
      availableTabs.reduce(
        (count, item) => (groupVisibility[item.k] === false ? count : count + 1),
        0,
      ),
    [availableTabs, groupVisibility],
  )

  const handleGroupToggle = useCallback(
    (groupKey: string) => {
      const isEnabled = groupVisibility[groupKey] !== false
      if (isEnabled && enabledGroupCount <= 1) {
        useUIStore.getState().showToast('至少保留一个工具组，以确保左栏可用。')
        return
      }
      setGroupVisibility(groupKey, !isEnabled)
      if (isEnabled && groupKey === activeGroup) {
        const fallbackGroup =
          availableTabs.find((item) => item.k !== groupKey && groupVisibility[item.k] !== false) ??
          availableTabs.find((item) => item.k !== groupKey)
        if (fallbackGroup) {
          setActiveGroup(fallbackGroup.k)
        }
      }
    },
    [activeGroup, availableTabs, enabledGroupCount, groupVisibility, setGroupVisibility],
  )

  const toolsForCurrentGroup = useMemo(() => currentTab?.tools ?? [], [currentTab])
  const enabledToolsInGroup = useMemo(
    () => toolsForCurrentGroup.filter((tool) => toolVisibility[tool] !== false),
    [toolsForCurrentGroup, toolVisibility],
  )

  const handleToolToggle = useCallback(
    (toolName: string) => {
      const isEnabled = toolVisibility[toolName] !== false
      if (isEnabled && enabledToolsInGroup.length <= 1) {
        useUIStore.getState().showToast('每个工具组至少保留一个工具。')
        return
      }
      setToolVisibility(toolName, !isEnabled)
      if (isEnabled && activeTool === toolName) {
        const fallbackTool =
          toolsForCurrentGroup.find(
            (name) => name !== toolName && toolVisibility[name] !== false,
          ) ?? toolsForCurrentGroup.find((name) => name !== toolName)
        if (fallbackTool) {
          setActiveTool(fallbackTool)
        }
      }
    },
    [
      activeTool,
      enabledToolsInGroup.length,
      setToolVisibility,
      toolsForCurrentGroup,
      toolVisibility,
    ],
  )

  const activeToolMeta = activeTool ? toolMetadataByName[activeTool] : undefined
  const modelOptions = useMemo<ToolVersion[]>(() => {
    return activeToolMeta?.versions ?? []
  }, [activeToolMeta])

  const visibleModels = useMemo(
    () => modelVisibility[activeTool] ?? {},
    [activeTool, modelVisibility],
  )
  const visibleModelCount = useMemo(
    () =>
      modelOptions.filter((item) => {
        const key = getVersionKey(item)
        return visibleModels[key] !== false
      }).length,
    [modelOptions, visibleModels],
  )

  const handleModelToggle = useCallback(
    (version: ToolVersion) => {
      if (!activeTool) return
      const key = getVersionKey(version)
      const isEnabled = visibleModels[key] !== false
      if (isEnabled && visibleModelCount <= 1) {
        useUIStore.getState().showToast('至少保留一个模型版本，以便在左栏选择。')
        return
      }
      setModelVisibility(activeTool, key, !isEnabled)
    },
    [activeTool, setModelVisibility, visibleModels, visibleModelCount],
  )

  const handleToggleAllModels = useCallback(
    (visible: boolean) => {
      if (!activeTool) return
      if (!visible && modelOptions.length > 0) {
        useUIStore.getState().showToast('至少保留一个模型版本。')
        return
      }
      setModelsForTool(
        activeTool,
        modelOptions.map((item) => getVersionKey(item)),
        visible,
      )
    },
    [activeTool, modelOptions, setModelsForTool],
  )

  const allModelsSelected = visibleModelCount === modelOptions.length && modelOptions.length > 0

  // 保存喜好配置
  const handleSave = useCallback(async () => {
    if (!configData || availableTabs.length === 0) {
      useUIStore.getState().showToast('数据未加载完成，请稍后再试')
      return
    }

    try {
      setIsSaving(true)

      // 收集所有勾选的工具ID (sub_category_ids)
      const sub_category_ids: number[] = []
      // 收集所有勾选的模型ID (ai_model_ids，注意是ai_model_id字段)
      const ai_model_ids: number[] = []

      // 遍历所有分类
      Object.entries(configData).forEach(([_categoryName, subCategories]) => {
        subCategories.forEach((subCategory: SubCategory) => {
          const toolName = subCategory.name

          // 检查工具是否勾选
          const isToolEnabled = toolVisibility[toolName] !== false
          if (isToolEnabled) {
            sub_category_ids.push(subCategory.id)

            // 检查该工具下勾选的模型版本
            const toolModels = modelVisibility[toolName] ?? {}
            subCategory.apis.forEach((api: AIModel) => {
              const modelKey = api.id.toString()
              const isModelEnabled = toolModels[modelKey] !== false
              if (isModelEnabled) {
                // 使用 ai_model_id 而不是 id
                ai_model_ids.push(api.ai_model_id)
              }
            })
          }
        })
      })

      await cmsService.saveUserLikeCategory({
        sub_category_ids,
        ai_model_ids,
      })

      useUIStore.getState().showToast('保存成功！')
    } catch (error) {
      console.error('[ModelPreferenceSection] Failed to save preferences:', error)
      useUIStore.getState().showToast('保存失败，请稍后重试')
    } finally {
      setIsSaving(false)
    }
  }, [availableTabs.length, configData, toolVisibility, modelVisibility])

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="模型喜好设定"
        description="选择左栏中展示的工具组、工具与模型版本。"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {availableTabs.length === 0 && !isLoading && (
          <div className="lg:col-span-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            工具配置读取失败或暂无可配置数据。
          </div>
        )}

        <GroupPanel
          availableTabs={availableTabs}
          currentTab={currentTab}
          groupVisibility={groupVisibility}
          enabledGroupCount={enabledGroupCount}
          isLoading={isLoading}
          onSetActiveGroup={setActiveGroup}
          onToggleGroup={handleGroupToggle}
        />

        <div className="lg:col-span-2 space-y-4">
          <ToolPanel
            toolsForCurrentGroup={toolsForCurrentGroup}
            enabledToolsCount={enabledToolsInGroup.length}
            activeTool={activeTool}
            toolVisibility={toolVisibility}
            toolMetadataByName={toolMetadataByName}
            onSetActiveTool={setActiveTool}
            onToggleTool={handleToolToggle}
          />

          <ModelPanel
            modelOptions={modelOptions}
            visibleModels={visibleModels}
            visibleModelCount={visibleModelCount}
            allModelsSelected={allModelsSelected}
            onToggleModel={handleModelToggle}
            onToggleAllModels={handleToggleAllModels}
          />

          <ActionsPanel
            themeColor={themeColor}
            isSaving={isSaving}
            isLoading={isLoading}
            onReset={reset}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  )
}

ModelPreferenceSection.displayName = 'ModelPreferenceSection'
