import { motion } from '@/components/ui/motion'
import React, { useState } from 'react'

interface WeChatSupportPanelProps {
  themeColor: string
}

const SUPPORT_WECHAT_ID = 'oasis-support'
const SUPPORT_EMAIL = 'contact@oasisintwrite.com'

export const WeChatSupportPanel: React.FC<WeChatSupportPanelProps> = ({ themeColor }) => {
  const [qrLoadFailed, setQrLoadFailed] = useState(false)

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
        {qrLoadFailed ? (
          <div
            role="alert"
            className="flex h-72 w-72 flex-col items-center justify-center rounded-lg bg-emerald-50 p-6 text-center"
          >
            <p className="text-sm font-semibold text-gray-900">二维码加载失败</p>
            <p className="mt-3 text-sm text-gray-600">请复制客服微信号添加：</p>
            <p className="mt-1 select-all rounded bg-white px-3 py-1 font-mono text-sm text-emerald-700">
              {SUPPORT_WECHAT_ID}
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 text-sm font-medium text-emerald-700 underline"
            >
              发送邮件给客服
            </a>
          </div>
        ) : (
          <img
            src="/wechat-qrcode.webp"
            alt="微信客服二维码"
            width={288}
            height={288}
            className="w-72 h-72 object-contain"
            onError={() => setQrLoadFailed(true)}
          />
        )}
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm font-medium" style={{ color: themeColor }}>
          {qrLoadFailed ? '复制微信号或发送邮件联系客服' : '扫描二维码添加客服微信'}
        </p>
        <p className="text-xs text-gray-500 mt-1">工作时间：周一至周五 9:00-18:00</p>
      </div>
    </motion.div>
  )
}

WeChatSupportPanel.displayName = 'WeChatSupportPanel'
