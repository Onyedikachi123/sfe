import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Icon } from '../Icon'
import styles from './Alert.module.css'

export interface AlertProps {
  children: ReactNode
  /** An optional control, e.g. a retry button, aligned to the end. */
  action?: ReactNode
  className?: string
}

/** An inline error banner. Announced when it appears (role="alert"). */
export function Alert({ children, action, className }: AlertProps) {
  return (
    <div role="alert" className={cx(styles.alert, className)}>
      <Icon name="alert" size={18} className={styles.icon} />
      <p className={styles.message}>{children}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
