import React from 'react'

interface FileUploadHintProps {
  accept: string
  maxFiles: number
  maxSize: number
  showHint: boolean
}

export const FileUploadHint: React.FC<FileUploadHintProps> = ({
  accept,
  maxFiles,
  maxSize,
  showHint,
}) => {
  if (!showHint) {
    return null
  }

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
      <p>• 最大文件大小: {(maxSize / 1024 / 1024).toFixed(1)}MB</p>
      <p>• 支持的文件类型: {accept}</p>
      {maxFiles > 1 ? <p>• 最多同时上传 {maxFiles} 个文件</p> : null}
    </div>
  )
}
