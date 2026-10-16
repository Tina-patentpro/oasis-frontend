import { WeChatSupportPanel } from '@/components/customer-service/sections/WeChatSupportPanel'
import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'

interface ResetPasswordDialogProps {
  isOpen: boolean
  onClose: () => void
}

const BRAND_COLOR = '#10b981'

export function ResetPasswordDialog({ isOpen, onClose }: ResetPasswordDialogProps) {
  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="reset-password-title"
      className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl"
    >
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id="reset-password-title" className="text-xl font-bold text-gray-900">
            重置密码
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            请扫码添加客服微信，并备注“重置密码”，我们会尽快协助你完成密码重置。
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="关闭重置密码弹窗"
        >
          ✕
        </button>
      </header>

      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm leading-6 text-emerald-800">
          添加后请发送登录手机号，方便客服尽快为你核验身份并处理重置请求。
        </div>

        <WeChatSupportPanel themeColor={BRAND_COLOR} />
      </div>
    </AccessibleDialog>
  )
}
