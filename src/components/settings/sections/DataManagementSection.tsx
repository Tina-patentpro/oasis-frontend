import React from 'react'

import { SettingsSectionHeader } from '../common/SettingsSectionHeader'

interface DataManagementSectionProps {
  onExportDataClick: () => void
  onExportWorkflowClick: () => void
  onDeleteAllDataClick: () => void
  isExportingAllData?: boolean
  exportAllDataProgressText?: string | null
}

export const DataManagementSection: React.FC<DataManagementSectionProps> = ({
  onExportDataClick,
  onExportWorkflowClick,
  onDeleteAllDataClick,
  isExportingAllData = false,
  exportAllDataProgressText = null,
}) => (
  <div className="space-y-6">
    <SettingsSectionHeader title="数据管理" description="管理您的数据导出和清理" />

    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-base font-semibold text-gray-900 mb-2">导出选择的数据</h4>
            <p className="text-sm text-gray-600 mb-4">
              选择并导出您的记录。支持批量选择多个数据进行导出。
            </p>
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              onClick={onExportWorkflowClick}
            >
              导出选择的数据
            </button>
          </div>
          <span className="text-3xl">📋</span>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-base font-semibold text-gray-900 mb-2">导出所有数据</h4>
            <p className="text-sm text-gray-600 mb-4">
              导出您在平台上的所有数据，包括会话记录、生成文档等。数据将以ZIP压缩包形式提供。
            </p>
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onExportDataClick}
              disabled={isExportingAllData}
            >
              {isExportingAllData ? '导出中…' : '导出数据'}
            </button>
            {exportAllDataProgressText && (
              <p className="mt-3 text-xs text-emerald-700" role="status" aria-live="polite">
                {exportAllDataProgressText}
              </p>
            )}
          </div>
          <span className="text-3xl">📤</span>
        </div>
      </div>

      <div className="border border-red-200 rounded-lg p-6 bg-red-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-base font-semibold text-red-900 mb-2">删除所有数据</h4>
            <p id="delete-all-data-description" className="text-sm text-red-700 mb-4">
              永久删除您的所有数据，包括会话历史、生成的文档等。此操作不可撤销，请谨慎操作。
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              onClick={onDeleteAllDataClick}
              aria-describedby="delete-all-data-description"
            >
              删除所有数据
            </button>
          </div>
          <span className="text-3xl">⚠️</span>
        </div>
      </div>
    </div>

    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">💡</span>
        <div className="text-sm text-amber-800">
          <div className="font-medium mb-1">数据安全提示</div>
          <p className="text-amber-700">
            我们重视您的数据安全。所有数据传输均采用SSL加密，数据存储符合相关法律法规要求。
          </p>
        </div>
      </div>
    </div>
  </div>
)

DataManagementSection.displayName = 'DataManagementSection'
