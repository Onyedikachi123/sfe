import type { SelectHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import { Field, useFieldIds } from '../Field'
import { Icon } from '../Icon'
import styles from './Select.module.css'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string
  hideLabel?: boolean
  options: readonly SelectOption[]
  fieldClassName?: string
}

export function Select({ label, hideLabel, options, fieldClassName, className, id, ...rest }: SelectProps) {
  const { controlId, descriptionId } = useFieldIds(id)

  return (
    <Field
      label={label}
      controlId={controlId}
      descriptionId={descriptionId}
      hideLabel={hideLabel}
      className={fieldClassName}
    >
      <div className={styles.control}>
        <select id={controlId} className={cx(styles.select, className)} {...rest}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={16} className={styles.chevron} />
      </div>
    </Field>
  )
}
