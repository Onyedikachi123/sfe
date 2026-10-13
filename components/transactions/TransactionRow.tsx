import type { Transaction } from '@/types/api'
import { Money } from '@/components/ui'
import { formatDateTime, formatMoney, formatTime, TRANSACTION_TYPE_LABELS } from '@/lib/format'
import { isCredit } from '@/lib/transactions/direction'
import { StatusBadge } from './StatusBadge'
import { TransactionAvatar } from './TransactionAvatar'
import styles from './TransactionRow.module.css'

export interface TransactionRowProps {
  transaction: Transaction
  onSelect?: (transaction: Transaction) => void
  /**
   * `grouped` rows sit under a day heading, so they show only the time; the fee is shown in the
   * details view instead. `standalone` rows (e.g. the dashboard) show date, time and fee.
   */
  variant?: 'standalone' | 'grouped'
}

export function TransactionRow({ transaction: tx, onSelect, variant = 'standalone' }: TransactionRowProps) {
  const credit = isCredit(tx.type)

  return (
    <button type="button" className={styles.row} onClick={() => onSelect?.(tx)}>
      <TransactionAvatar transaction={tx} />
      <span className={styles.main}>
        <span className={styles.title}>{TRANSACTION_TYPE_LABELS[tx.type]}</span>
        <span className={styles.narration}>{tx.narration}</span>
      </span>
      <StatusBadge status={tx.status} className={styles.status} />
      <span className={styles.end}>
        <Money
          amount={tx.amount}
          currency={tx.currency}
          sign={credit ? 'credit' : 'debit'}
          className={credit ? styles.credit : styles.amount}
        />
        <span className={styles.meta}>
          {variant === 'grouped' ? (
            formatTime(tx.createdAt)
          ) : (
            <>
              {formatDateTime(tx.createdAt)}
              {tx.fee > 0 && ` · Fee ${formatMoney(tx.fee, tx.currency)}`}
            </>
          )}
        </span>
      </span>
    </button>
  )
}
