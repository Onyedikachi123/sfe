import type { Transaction, TransactionType } from '@/types/api'
import { Icon, type IconName } from '@/components/ui'
import { cx } from '@/lib/cx'
import { getInitials } from '@/lib/format'
import styles from './TransactionAvatar.module.css'

const TYPE_ICONS: Record<TransactionType, IconName> = {
  deposit: 'arrow-down-left',
  transfer_in: 'arrow-down-left',
  withdrawal: 'arrow-up-right',
  transfer_out: 'arrow-up-right',
  conversion: 'swap',
  card_payment: 'card',
  bill_payment: 'receipt',
}

/** A person or company gets their initials, like the design; everything else gets the type icon. */
export function TransactionAvatar({
  transaction: tx,
  size = 'md',
  className,
}: {
  transaction: Pick<Transaction, 'type' | 'counterparty'>
  size?: 'md' | 'lg'
  className?: string
}) {
  const initials = tx.counterparty ? getInitials(tx.counterparty) : ''
  return (
    <span className={cx(styles.avatar, styles[size], className)} aria-hidden>
      {initials || <Icon name={TYPE_ICONS[tx.type]} size={size === 'lg' ? 20 : 18} />}
    </span>
  )
}
