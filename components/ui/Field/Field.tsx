import { useId, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import styles from './Field.module.css'

/**
 * Ids that tie a Field's label and description to its control. A caller-supplied `id` wins so
 * pages can still target the control (tests, anchors, external labels).
 */
export function useFieldIds(id?: string) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  return { controlId, descriptionId: `${controlId}-description` }
}

/** Joins describedby ids, skipping empty ones; undefined when nothing describes the control. */
export function describedBy(...ids: Array<string | false | null | undefined>): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined
}

export interface FieldProps {
  label: string
  /** Id of the control this field labels. */
  controlId: string
  /** Id given to the hint/error so the control can reference it with aria-describedby. */
  descriptionId: string
  hint?: ReactNode
  error?: string
  /** Visually hide the label (it is still rendered). */
  hideLabel?: boolean
  className?: string
  children: ReactNode
}

/** Label + control + hint/error. Used by Input and Select. */
export function Field({
  label,
  controlId,
  descriptionId,
  hint,
  error,
  hideLabel,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={controlId} className={cx(styles.label, hideLabel && 'visually-hidden')}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={descriptionId} className={styles.error}>
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
