import type { ReactNode } from 'react'
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from 'framer-motion'

export { AnimatePresence }

export const motion = m

interface MotionProviderProps {
  children: ReactNode
}

export const MotionProvider = ({ children }: MotionProviderProps) => (
  <MotionConfig reducedMotion="user">
    <LazyMotion features={domAnimation}>{children}</LazyMotion>
  </MotionConfig>
)
