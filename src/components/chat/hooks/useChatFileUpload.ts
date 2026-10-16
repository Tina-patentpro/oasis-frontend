import { useCallback, useEffect, useRef, useState } from 'react'

import {
  MAX_CHAT_ATTACHMENT_COUNT,
  MAX_CHAT_FILE_SIZE,
  MAX_CHAT_FILE_SIZE_MB,
} from '@/constants/chatUpload'

import { useClickOutside } from '../../../hooks/useClickOutside'

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/csv',
  'application/csv',
  'text/html',
  'application/xml',
  'text/xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

const ALLOWED_FILE_EXTENSIONS = [
  '.txt',
  '.md',
  '.pdf',
  '.html',
  '.htm',
  '.xlsx',
  '.xls',
  '.docx',
  '.doc',
  '.csv',
  '.pptx',
  '.ppt',
  '.xml',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
]

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex < 0) return ''
  return filename.slice(dotIndex).toLowerCase()
}

function isAllowedChatAttachmentFile(file: File): boolean {
  const normalizedType = file.type.toLowerCase()
  if (normalizedType.startsWith('image/')) return true
  if (ALLOWED_FILE_TYPES.includes(normalizedType)) return true
  return ALLOWED_FILE_EXTENSIONS.includes(getFileExtension(file.name))
}

function isAllowedImageAttachmentFile(file: File): boolean {
  const normalizedType = file.type.toLowerCase()
  if (normalizedType.startsWith('image/')) return true
  return ALLOWED_IMAGE_EXTENSIONS.includes(getFileExtension(file.name))
}

function filesToFileList(files: File[]): FileList | null {
  try {
    const dt = new DataTransfer()
    files.forEach((f) => dt.items.add(f))
    return dt.files
  } catch {
    // DataTransfer constructor not supported (Safari < 14.1)
    return null
  }
}

interface UseChatFileUploadOptions {
  onAddAttachment: (files: FileList | null, type: 'image' | 'file') => void
  notify: (message: string) => void
}

export function useChatFileUpload({ onAddAttachment, notify }: UseChatFileUploadOptions) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useClickOutside([menuBtnRef, menuRef], () => setMenuOpen(false), menuOpen)

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [menuOpen])

  // Close attachment menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        e.preventDefault()
        setMenuOpen(false)
        menuBtnRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  const validateAndFilterFiles = useCallback(
    (
      files: FileList,
      notifyFn: (msg: string) => void,
      isAllowedFile: (file: File) => boolean = isAllowedChatAttachmentFile,
    ): File[] => {
      const arr = Array.from(files)
      const valid: File[] = []
      for (const f of arr) {
        if (f.size > MAX_CHAT_FILE_SIZE) {
          notifyFn(`文件"${f.name}"超过${MAX_CHAT_FILE_SIZE_MB}MB大小限制`)
          continue
        }
        if (!isAllowedFile(f)) {
          notifyFn(`文件"${f.name}"的类型不支持`)
          continue
        }
        valid.push(f)
      }
      if (valid.length > MAX_CHAT_ATTACHMENT_COUNT) {
        notifyFn(
          `最多上传${MAX_CHAT_ATTACHMENT_COUNT}个文件，已保留前${MAX_CHAT_ATTACHMENT_COUNT}个`,
        )
      }

      return valid.slice(0, MAX_CHAT_ATTACHMENT_COUNT)
    },
    [],
  )

  const handleAttach = useCallback((type: 'image' | 'file'): void => {
    setMenuOpen(false)
    if (type === 'image') imageInputRef.current?.click()
    else fileInputRef.current?.click()
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const nextTarget = e.relatedTarget
    if (nextTarget instanceof Node && e.currentTarget.contains(nextTarget)) {
      return
    }
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        const valid = validateAndFilterFiles(files, notify)
        if (valid.length > 0) {
          const fileList = filesToFileList(valid)
          if (fileList) {
            const hasImage = Array.from(fileList).some((f) => f.type.startsWith('image/'))
            onAddAttachment(fileList, hasImage && fileList.length === 1 ? 'image' : 'file')
          } else {
            notify('当前浏览器不支持文件上传，请升级浏览器')
          }
        }
      }
    },
    [onAddAttachment, validateAndFilterFiles, notify],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageFiles: File[] = []
      let hasText = false
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile()
          if (file) imageFiles.push(file)
        } else if (items[i].type.startsWith('text/')) {
          hasText = true
        }
      }
      if (imageFiles.length > 0 && !hasText) {
        e.preventDefault()
        const valid = imageFiles.filter((f) => {
          if (f.size > MAX_CHAT_FILE_SIZE) {
            notify(`粘贴的图片超过${MAX_CHAT_FILE_SIZE_MB}MB大小限制`)
            return false
          }
          return true
        })
        if (valid.length > 0) {
          const fileList = filesToFileList(valid)
          if (fileList) {
            onAddAttachment(fileList, 'image')
          } else {
            notify('当前浏览器不支持文件上传，请升级浏览器')
          }
        }
      }
    },
    [onAddAttachment, notify],
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const valid = validateAndFilterFiles(e.target.files, notify)
        if (valid.length > 0) {
          const fileList = filesToFileList(valid)
          if (fileList) {
            onAddAttachment(fileList, 'file')
          } else {
            notify('当前浏览器不支持文件上传，请升级浏览器')
          }
        }
      }
      e.target.value = ''
    },
    [onAddAttachment, validateAndFilterFiles, notify],
  )

  const handleImageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const valid = validateAndFilterFiles(e.target.files, notify, isAllowedImageAttachmentFile)
        if (valid.length > 0) {
          const fileList = filesToFileList(valid)
          if (fileList) {
            onAddAttachment(fileList, 'image')
          } else {
            notify('当前浏览器不支持文件上传，请升级浏览器')
          }
        }
      }
      e.target.value = ''
    },
    [onAddAttachment, validateAndFilterFiles, notify],
  )

  const toggleMenu = useCallback(() => {
    setMenuOpen((o: boolean) => !o)
  }, [])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
  }, [])

  return {
    menuOpen,
    menuBtnRef,
    menuRef,
    fileInputRef,
    imageInputRef,
    isDragOver,
    handleAttach,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
    handleFileInputChange,
    handleImageInputChange,
    toggleMenu,
    closeMenu,
  }
}
