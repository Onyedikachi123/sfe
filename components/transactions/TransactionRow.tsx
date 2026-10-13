import type { Transaction, TransactionType } from '@/types/api'
import { Icon, type IconName, Money } from '@/components/ui'
import { formatDateTime, formatMoney, formatTime, getInitials, TRANSACTION_TYPE_LABELS } from '@/lib/format'
import { StatusBadge } from './StatusBadge'
import styles from './TransactionRow.module.css'

const TYPE_ICONS: Record<TransactionType, IconName> = {
  deposit: 'arrow-down-left',
  transfer_in: 'arrow-down-left',
  withdrawal: 'arrow-up-right',
  transfer_out: 'arrow-up-right',
  conversion: 'swap',
  card_payment: 'card',
  bill_payment: 'receipt',
}

const CREDIT_TYPES: TransactionType[] = ['deposit', 'transfer_in', 'conversion']

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
  const isCredit = CREDIT_TYPES.includes(tx.type)
  // A person or company gets their initials, like the design; everything else gets the type icon.
  const initials = tx.counterparty ? getInitials(tx.counterparty) : ''

  return (
    <button type="button" className={styles.row} onClick={() => onSelect?.(tx)}>
      <span className={styles.icon} aria-hidden>
        {initials ? (
          <span className={styles.initials}>{initials}</span>
        ) : (
          <Icon name={TYPE_ICONS[tx.type]} size={18} />
        )}
      </span>
      <span className={styles.main}>
        <span className={styles.title}>{TRANSACTION_TYPE_LABELS[tx.type]}</span>
        <span className={styles.narration}>{tx.narration}</span>
      </span>
      <StatusBadge status={tx.status} className={styles.status} />
      <span className={styles.end}>
        <Money
          amount={tx.amount}
          currency={tx.currency}
          sign={isCredit ? 'credit' : 'debit'}
          className={isCredit ? styles.credit : styles.amount}
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
