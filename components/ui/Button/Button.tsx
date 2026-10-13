import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from '../Icon'
import styles from './Button.module.css'

export interface ButtonProps {
  children?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  /** Defaults to "button" so a Button inside a form never submits it by accident. */
  type?: 'button' | 'submit' | 'reset'
  iconLeft?: IconName
  iconRight?: IconName
  fullWidth?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  'aria-label'?: string
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  iconLeft,
  iconRight,
  fullWidth,
  disabled,
  onClick,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        className
      )}
      onClick={onClick}
      {...rest}
    >
      {iconLeft && <Icon name={iconLeft} size={16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={16} />}
    </button>
  )
}
