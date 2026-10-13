import type { Currency } from '@/types/api'
import { cx } from '@/lib/cx'
import { formatMoney } from '@/lib/format'
import styles from './Money.module.css'

export interface MoneyProps {
  /** Minor units. */
  amount: number
  currency: Currency
  /** Prefix with + or -. */
  sign?: 'credit' | 'debit'
  className?: string
}

export function Money({ amount, currency, sign, className }: MoneyProps) {
  // `sign` alone decides the direction, so a negative amount can't turn into "--" or a "+-" pair.
  const text = sign
    ? formatMoney(sign === 'debit' ? -Math.abs(amount) : Math.abs(amount), currency, {
        signDisplay: 'always',
      })
    : formatMoney(amount, currency)
  return <span className={cx(styles.money, className)}>{text}</span>
}
