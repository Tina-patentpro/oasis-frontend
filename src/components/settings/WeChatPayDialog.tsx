import { useEffect, useState, useCallback, useRef } from 'react'
import { billingService } from '@/api/services/billing.service'
import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'

interface WeChatPayDialogProps {
  isOpen: boolean
  onClose: () => void
  codeUrl: string
  amount: number
  outTradeNo: string
  onSuccess?: () => void
}

function WeChatPayDialogContent({
  isOpen,
  onClose,
  codeUrl,
  amount,
  outTradeNo,
  onSuccess,
}: WeChatPayDialogProps) {
  const [countdown, setCountdown] = useState(300) // 5分钟倒计时
  const [paymentStatus, setPaymentStatus] = useState<
    'pending' | 'success' | 'expired' | 'cancelled'
  >('pending')
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const statusCheckInFlightRef = useRef(false)
  const isMountedRef = useRef(true)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      onClose()
    }, 2000)
  }, [onClose])

  // 轮询订单状态
  const checkOrderStatus = useCallback(async () => {
    if (paymentStatus !== 'pending' || !outTradeNo || !isOpen || statusCheckInFlightRef.current) {
      return
    }

    statusCheckInFlightRef.current = true
    setIsCheckingStatus(true)
    try {
      const result = await billingService.queryOrderStatus(outTradeNo)
      if (!isMountedRef.current) return

      // apiClient已经自动提取了data字段，result直接是数字: 0: 未支付, 1: 已支付, 2: 失败
      // 需要兼容两种情况：result是数字 或 result.data是数字
      const status = typeof result === 'number' ? result : (result as { data: number }).data

      if (status === 1) {
        // 支付成功

        setPaymentStatus('success')
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current)
          pollingTimerRef.current = null
        }
        onSuccess?.()
        // 2秒后自动关闭对话框
        scheduleClose()
      } else if (status === 2) {
        // 支付失败

        setPaymentStatus('cancelled')
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current)
          pollingTimerRef.current = null
        }
        scheduleClose()
      }
      // status === 0: 继续轮询
    } catch (error) {
      if (isMountedRef.current) {
        console.error('[WeChatPayDialog] 查询订单状态失败:', error)
      }
      // 出错不停止轮询，继续尝试
    } finally {
      statusCheckInFlightRef.current = false
      if (isMountedRef.current) {
        setIsCheckingStatus(false)
      }
    }
  }, [paymentStatus, outTradeNo, isOpen, onSuccess, scheduleClose])

  // 启动/停止轮询
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'pending' || !outTradeNo) {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
      }
      return
    }

    // 立即检查一次
    initialCheckTimerRef.current = setTimeout(() => {
      initialCheckTimerRef.current = null
      void checkOrderStatus()
    }, 0)

    // 每3秒轮询一次
    pollingTimerRef.current = setInterval(() => {
      checkOrderStatus()
    }, 3000)

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
      }
      if (initialCheckTimerRef.current) {
        clearTimeout(initialCheckTimerRef.current)
        initialCheckTimerRef.current = null
      }
    }
  }, [isOpen, paymentStatus, outTradeNo, checkOrderStatus])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      if (initialCheckTimerRef.current) {
        clearTimeout(initialCheckTimerRef.current)
        initialCheckTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, countdown])

  useEffect(() => {
    if (countdown <= 0) {
      setTimeout(() => {
        setPaymentStatus('expired')
      }, 0)
    }
  }, [countdown])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleCancel = () => {
    setPaymentStatus('cancelled')
    onClose()
  }

  const handleDialogClose = () => {
    if (paymentStatus === 'pending') {
      handleCancel()
      return
    }
    onClose()
  }

  const handleSuccess = () => {
    void checkOrderStatus()
  }

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={handleDialogClose}
      labelledBy="wechat-pay-title"
      initialFocusRef={closeButtonRef}
      closeOnOverlayClick={false}
      overlayClassName="bg-black/50 backdrop-blur-sm"
      className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
    >
      {paymentStatus === 'success' ? (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-10 w-10 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 id="wechat-pay-title" className="mb-2 text-xl font-bold text-gray-900">
            支付成功！
          </h3>
          <p className="text-sm text-gray-600">充值金额 ¥{amount.toFixed(2)} 已到账</p>
        </div>
      ) : paymentStatus === 'expired' ? (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-10 w-10 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 id="wechat-pay-title" className="mb-2 text-xl font-bold text-gray-900">
            二维码已过期
          </h3>
          <p className="mb-4 text-sm text-gray-600">请重新发起充值</p>
          <button
            type="button"
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h3 id="wechat-pay-title" className="text-lg font-bold text-gray-900">
              微信支付
            </h3>
            <button
              ref={closeButtonRef}
              type="button"
              className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
              onClick={handleCancel}
              aria-label="关闭微信支付弹窗"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mb-4 text-center">
            <div className="mb-2 text-3xl font-bold text-gray-900">¥{amount.toFixed(2)}</div>
            <div className="text-sm text-gray-600">订单号：{outTradeNo}</div>
          </div>

          <div className="mb-4 flex justify-center">
            <div className="rounded-lg border-2 border-gray-200 p-4 bg-white">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(codeUrl)}`}
                alt="微信支付二维码"
                width={200}
                height={200}
                className="h-48 w-48"
              />
            </div>
          </div>

          <div className="mb-4 text-center">
            <p className="mb-2 text-sm text-gray-600">请使用微信扫码支付</p>
            <div className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
              <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              支付剩余时间：{formatTime(countdown)}
            </div>
          </div>

          <div className="rounded-lg bg-emerald-50 p-3">
            <div className="flex items-start gap-2">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-xs text-emerald-700">
                <p className="mb-1">支付完成后，系统将自动更新您的账户余额</p>
                <p>如有问题，请联系客服处理</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={handleCancel}
            >
              取消
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              onClick={handleSuccess}
              disabled={isCheckingStatus}
              aria-busy={isCheckingStatus}
            >
              我已完成支付
            </button>
          </div>
        </>
      )}
    </AccessibleDialog>
  )
}

export function WeChatPayDialog(props: WeChatPayDialogProps) {
  if (!props.isOpen) {
    return null
  }

  return <WeChatPayDialogContent key={props.outTradeNo} {...props} />
}
