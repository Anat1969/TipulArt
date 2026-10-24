import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Rich } from './Rich'

export function PageHeader({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ marginBottom: 'var(--s5)' }}
    >
      <div className="label kicker" style={{ marginBottom: 'var(--s2)' }}>{kicker}</div>
      <h1>{title}</h1>
      {children && <div className="lede">{typeof children === 'string' ? <Rich text={children} nums /> : children}</div>}
    </motion.header>
  )
}
