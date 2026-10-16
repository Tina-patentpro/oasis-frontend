const normalizeInputSectionKey = (key: string) => key.replace(/[^a-zA-Z0-9_-]/g, '-')

export const getInputSectionTabId = (key: string) =>
  `input-section-tab-${normalizeInputSectionKey(key)}`

export const getInputSectionPanelId = (key: string) =>
  `input-section-panel-${normalizeInputSectionKey(key)}`
