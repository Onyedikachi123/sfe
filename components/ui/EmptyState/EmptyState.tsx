import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from '../Icon'
import styles from './EmptyState.module.css'

export interface EmptyStateProps {
  icon: IconName
  /** `danger` for failures; `primary` for neutral "nothing here" states. */
  tone?: 'primary' | 'danger'
  title: string
  description?: ReactNode
  action?: ReactNode
  /** `alert` for errors, so assistive tech announces them when they appear. */
  role?: 'alert' | 'status'
  className?: string
}

/** Centred icon, title, description and optional action for empty, no-result and error states. */
export function EmptyState({
  icon,
  tone = 'primary',
  title,
  description,
  action,
  role,
  className,
}: EmptyStateProps) {
  return (
    <div className={cx(styles.state, className)} role={role}>
      <span className={cx(styles.icon, styles[tone])}>
        <Icon name={icon} size={20} />
      </span>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
