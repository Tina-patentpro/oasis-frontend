import { memo } from 'react'

type StepStatus = 'pending' | 'active' | 'completed'

interface StepProps {
  i: number
  txt: string
  status?: StepStatus
  color: string
}

const statusClasses: Record<StepStatus, string> = {
  active: 'text-white shadow-sm',
  completed: 'bg-gray-300 text-gray-600',
  pending: 'bg-gray-100 text-gray-500 border border-dashed border-gray-300',
}

export const Step = memo<StepProps>(({ i, txt, status = 'pending', color }) => {
  const isActive = status === 'active'
  const className =
    'px-3 py-1 rounded-full transition-colors duration-200 text-sm ' + statusClasses[status]

  return (
    <div
      className={className}
      style={isActive ? { backgroundColor: color } : undefined}
      role="status"
      aria-label={`步骤 ${i}: ${txt}${isActive ? ' (当前)' : status === 'completed' ? ' (已完成)' : ''}`}
    >
      {i}. {txt}
    </div>
  )
})

Step.displayName = 'Step'
