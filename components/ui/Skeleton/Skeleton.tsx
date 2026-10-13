import { cx } from '@/lib/cx'
import styles from './Skeleton.module.css'

export interface SkeletonProps {
  shape?: 'line' | 'circle'
  /** Size it from the caller's CSS Module (width/height). */
  className?: string
}

/** A placeholder block for content that is still loading. Decorative: announce loading elsewhere. */
export function Skeleton({ shape = 'line', className }: SkeletonProps) {
  return <span className={cx(styles.skeleton, styles[shape], className)} aria-hidden />
}
