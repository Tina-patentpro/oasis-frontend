import { createTimestampedFileName, EXPORT_FORMATS } from '../download'

export async function convertToFormat(
  data: Record<string, unknown>,
  format: keyof typeof EXPORT_FORMATS,
): Promise<{ blob: Blob; filename: string }> {
  switch (format) {
    case 'csv': {
      const items = Array.isArray(data['items']) ? (data['items'] as Record<string, unknown>[]) : []
      const csv = convertToCSV(items)
      return {
        blob: new Blob([csv], { type: 'text/csv' }),
        filename: createTimestampedFileName((data['type'] as string) || 'export', 'csv'),
      }
    }
    case 'xlsx':
      // Note: 暂不支持 native xlsx 生成，回退为 JSON 格式下载。
      // API 目前仅支持 recharge/exportrunningwater 的 Excel 导出。
      return {
        blob: new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        filename: createTimestampedFileName((data['type'] as string) || 'export', 'xlsx'),
      }
    case 'pdf':
      // Note: 暂不支持 native pdf 生成，回退为 JSON 格式下载。
      return {
        blob: new Blob([JSON.stringify(data, null, 2)], { type: 'application/pdf' }),
        filename: createTimestampedFileName((data['type'] as string) || 'export', 'pdf'),
      }
    case 'json':
    default:
      return {
        blob: new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        filename: createTimestampedFileName((data['type'] as string) || 'export', 'json'),
      }
  }
}

function convertToCSV(items: Record<string, unknown>[]): string {
  if (!items.length) {
    return ''
  }

  const headers = Object.keys(items[0] ?? {})

  const rows = items.map((item) =>
    headers
      .map((key) => {
        const value = item[key]
        if (value == null) {
          return ''
        }
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      .join(','),
  )

  return [headers.join(','), ...rows].join('\n')
}
