import { type FC } from 'react'

import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'

import { WeChatSupportPanel } from './customer-service/sections/WeChatSupportPanel'

interface CustomerServiceDialogProps {
  isOpen: boolean
  onClose: () => void
  themeColor: string
}

export const CustomerServiceDialog: FC<CustomerServiceDialogProps> = ({
  isOpen,
  onClose,
  themeColor,
}) => {
  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="customer-service-title"
      className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative"
    >
      <header className="flex items-center justify-between mb-6">
        <div>
          <h2 id="customer-service-title" className="text-xl font-bold text-gray-900">
            联系客服
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            扫码添加微信客服，我们将为您提供专业支持和服务。
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-600"
          aria-label="关闭客服窗口"
        >
          ✕
        </button>
      </header>

      <div className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">微信客服</h3>
          <p className="text-xs text-gray-500">
            扫码添加专属客服，支持实时沟通、远程协助以及产品演示。
          </p>
        </section>

        <WeChatSupportPanel themeColor={themeColor} />

        <section className="space-y-4 text-xs text-gray-500 border-t pt-4">
          <div>
            <div className="font-medium text-gray-900">可处理事项</div>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>功能演示与使用指南</li>
              <li>套餐与商务合作咨询</li>
              <li>紧急问题快速响应</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-gray-900">服务时间</div>
            <p className="mt-1">工作日 09:00 - 18:00，节假日提供值班支持。</p>
          </div>
        </section>
      </div>
    </AccessibleDialog>
  )
}

CustomerServiceDialog.displayName = 'CustomerServiceDialog'
