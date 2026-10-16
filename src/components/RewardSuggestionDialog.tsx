import { motion } from '@/components/ui/motion'
import React, { useEffect, useId, useRef, useState } from 'react'

import { userService } from '../api/services/user.service'
import { useAuthStore, useUserStore } from '../stores'
import { AccessibleDialog } from './ui/feedback/AccessibleDialog'

interface RewardSuggestionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmitted?: () => void
  themeColor: string
}

export const RewardSuggestionDialog: React.FC<RewardSuggestionDialogProps> = ({
  isOpen,
  onClose,
  onSubmitted,
  themeColor,
}) => {
  const [title, setTitle] = useState('')
  const [contact, setContact] = useState('')
  const [idea, setIdea] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const errorId = useId()

  const authPhone = useAuthStore((state) => state.user?.phone)
  const userStorePhone = useUserStore((state) => state.phone)
  const setPhoneManually = useUserStore((state) => state.setPhone)
  // 优先用 Auth 源，其次用 UserStore，两者都无则留空
  const userPhone = authPhone ?? userStorePhone

  // 追踪联系方式是否已自动预填，避免重复设置
  const contactAutoFilledRef = useRef(false)

  // 弹窗关闭时重置预填标记
  useEffect(() => {
    if (!isOpen) {
      contactAutoFilledRef.current = false
    }
  }, [isOpen])

  // 弹窗打开时，若联系方式为空且用户有手机号且尚未自动预填，则自动预填
  useEffect(() => {
    if (isOpen && !contact && !contactAutoFilledRef.current && userPhone) {
      setContact(userPhone)
      contactAutoFilledRef.current = true
    }
  }, [isOpen, userPhone, contact])

  const handleFieldFocus = (event: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const el = event.currentTarget
    el.style.boxShadow = `0 0 0 2px ${themeColor}33`
    el.style.borderColor = themeColor
  }

  const handleFieldBlur = (event: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const el = event.currentTarget
    el.style.boxShadow = ''
    el.style.borderColor = ''
  }

  const resetState = () => {
    setTitle('')
    setContact('')
    setIdea('')
    setError(null)
    setSubmitted(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedIdea = idea.trim()
    const trimmedContact = contact.trim()

    if (!trimmedTitle) {
      setError('请填写建议标题。')
      return
    }

    if (trimmedTitle.length < 4) {
      setError('建议标题请至少 4 个字，方便概括您的建议。')
      return
    }

    if (!trimmedIdea) {
      setError('请填写具体的功能建议或使用体验。')
      return
    }

    if (trimmedIdea.length < 5) {
      setError('建议内容请至少描述 5 个字，方便我们理解您的需求。')
      return
    }

    if (!trimmedContact) {
      setError('请留下邮箱或微信，方便我们联系并发放奖励。')
      return
    }

    if (attachment && attachment.size > 5 * 1024 * 1024) {
      setError('上传的图片过大，请控制在 5MB 以内。')
      return
    }

    setError(null)
    setUploading(true)

    try {
      let fileUrl = uploadedFileUrl || ''

      // 步骤1：如果有附件且还未上传，先上传文件
      if (attachment && !uploadedFileUrl) {
        const uploadResponse = await userService.uploadFile(attachment)
        // apiClient.uploadFile 已自动提取 data 字段，uploadResponse 直接包含 saved_path、filename 等字段。
        fileUrl = uploadResponse.saved_path || ''
        setUploadedFileUrl(fileUrl)
      }

      // 步骤2：提交建议到后端

      await userService.createSuggestion({
        title: trimmedTitle,
        content: trimmedIdea,
        url: fileUrl,
        contact_information: trimmedContact,
      })

      setSubmitted(true)
      onSubmitted?.()
    } catch (err) {
      console.error('提交失败:', err)
      setError('提交失败，请稍后重试。')
    } finally {
      setUploading(false)
    }
  }

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('仅支持上传图片文件。')
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('上传的图片过大，请控制在 5MB 以内。')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setAttachment(file)
    setError(null)
  }

  const clearAttachment = () => {
    setAttachment(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={handleClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      overlayClassName="bg-black/45"
      className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl p-8"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 id={titleId} className="text-2xl font-semibold text-gray-900">
            有奖建议征集
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-gray-500">
            分享你的真实使用感受与功能建议，采纳后将获得平台赠礼（包含 30-200
            元的额度奖励）或专属功能优先体验权。
          </p>
        </div>
        <motion.button
          onClick={handleClose}
          className="h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center"
          aria-label="关闭有奖建议征集窗口"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ✕
        </motion.button>
      </div>

      {submitted ? (
        <div className="space-y-5 text-center py-12">
          <div
            className="mx-auto h-16 w-16 rounded-full flex items-center justify-center text-white text-3xl"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }}
          >
            🎉
          </div>
          <h3 className="text-xl font-semibold text-gray-900">感谢你的宝贵建议！</h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            我们的产品团队会在 3 个工作日内完成评审，并通过你留下的联系方式反馈进展与奖励发放信息。
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={handleClose}
            >
              关闭
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm text-white transition-colors"
              style={{ background: themeColor }}
              onClick={() => {
                setSubmitted(false)
                setTitle('')
                setIdea('')
                setContact('')
                setError(null)
              }}
            >
              继续提交
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          aria-label="提交有奖建议"
          aria-describedby={error ? errorId : undefined}
        >
          <div className="space-y-3">
            <label htmlFor="suggestion-title" className="block text-sm font-medium text-gray-700">
              建议标题
            </label>
            <input
              id="suggestion-title"
              type="text"
              className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              placeholder="例如：增加草稿自动保存功能、支持批量导入专利方案"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="suggestion-content" className="block text-sm font-medium text-gray-700">
              建议内容
            </label>
            <textarea
              id="suggestion-content"
              className="w-full min-h-[160px] rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              placeholder="例如：希望在对话区支持草稿模式；建议增加批量导入方案，方便一次整理多个专利点……"
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
            />
          </div>

          <div className="space-y-3">
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="suggestion-attachment"
            >
              参考素材（可选）
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
              >
                <span className="text-lg">📎</span>
                <span>上传图片</span>
              </button>
              {preview && (
                <div className="relative">
                  <img
                    src={preview}
                    alt="上传预览"
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-lg"
                    aria-label="删除预览"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAttachmentChange}
              id="suggestion-attachment"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="suggestion-contact" className="block text-sm font-medium text-gray-700">
              联系方式
            </label>
            <input
              id="suggestion-contact"
              type="text"
              className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              placeholder="请输入微信号，用于通知奖励领取"
              value={contact}
              onChange={(event) => {
                const val = event.target.value
                setContact(val)
                // 记录为用户手动输入，后续不再被 Auth 覆盖
                setPhoneManually(val)
              }}
              onFocus={handleFieldFocus}
              onBlur={handleFieldBlur}
            />
          </div>

          <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 px-4 py-3 text-xs text-emerald-700">
            我们会保护你的隐私信息，仅用于回访与奖励发放。优秀建议将在社区内署名展示，届时会提前与你确认。
          </div>

          {error && (
            <div
              id={errorId}
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleClose}
              disabled={uploading}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white shadow-lg transition-[background-color,border-color,color,box-shadow,opacity,transform] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: themeColor, boxShadow: `0 12px 30px ${themeColor}33` }}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>提交中…</span>
                </>
              ) : (
                '提交建议'
              )}
            </button>
          </div>
        </form>
      )}
    </AccessibleDialog>
  )
}
