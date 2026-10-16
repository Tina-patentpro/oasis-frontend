/**
 * 页面加载占位组件
 * 用于 Suspense fallback，提供统一的加载动画
 */
export const LoadingFallback = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-500" />
    </div>
  )
}
