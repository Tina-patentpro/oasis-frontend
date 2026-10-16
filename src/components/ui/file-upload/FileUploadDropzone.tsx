import React from 'react'
import { Upload } from 'lucide-react'

import { getDropzoneClassName } from './view-state'

interface FileUploadDropzoneProps {
  accept: string
  fileInputRef: React.RefObject<HTMLInputElement | null>
  hasSelectedFiles: boolean
  isDragging: boolean
  isSelectionDisabled: boolean
  multiple: boolean
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  onFileSelect: (files: FileList | null) => void
}

export const FileUploadDropzone: React.FC<FileUploadDropzoneProps> = ({
  accept,
  fileInputRef,
  hasSelectedFiles,
  isDragging,
  isSelectionDisabled,
  multiple,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileSelect,
}) => (
  <div
    aria-disabled={isSelectionDisabled}
    className={getDropzoneClassName({
      hasSelectedFiles,
      isDragging,
      isSelectionDisabled,
    })}
    onDragLeave={onDragLeave}
    onDragOver={onDragOver}
    onDrop={onDrop}
  >
    <input
      aria-label="选择上传文件"
      ref={fileInputRef}
      accept={accept}
      className="hidden"
      disabled={isSelectionDisabled}
      multiple={multiple}
      onChange={(event) => onFileSelect(event.target.files)}
      type="file"
    />

    <div className="pointer-events-none">
      <Upload className="w-12 h-12 text-gray-500 mb-2" />
      <p className="text-gray-600">
        {isDragging ? '释放以加入待上传队列' : '拖拽文件到此处加入待上传队列'}
      </p>
      {multiple ? <p className="text-sm text-gray-500">支持多文件加入待上传队列</p> : null}
    </div>
  </div>
)
