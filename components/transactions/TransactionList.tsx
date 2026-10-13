import { useId } from 'react'
import type { Transaction } from '@/types/api'
import { Card, Skeleton } from '@/components/ui'
import { cx } from '@/lib/cx'
import { groupByDay } from '@/lib/transactions/group'
import { TransactionRow } from './TransactionRow'
import styles from './TransactionList.module.css'

export interface TransactionListProps {
  transactions: readonly Transaction[]
  /** Reference point for "Today" / "Yesterday"; pass when the data was fetched. */
  now: Date
  onSelect?: (transaction: Transaction) => void
  /** Rows are from the previous page/filter while the new ones load. */
  isStale?: boolean
}

export function TransactionList({ transactions, now, onSelect, isStale = false }: TransactionListProps) {
  const id = useId()
  return (
    <div className={cx(styles.list, isStale && styles.stale)} aria-busy={isStale}>
      <Card padding="none">
        {groupByDay(transactions, now).map((group) => (
          <section key={group.key} aria-labelledby={`${id}-${group.key}`}>
            <h2 id={`${id}-${group.key}`} className={styles.day}>
              {group.label}
            </h2>
            {group.transactions.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} variant="grouped" onSelect={onSelect} />
            ))}
          </section>
        ))}
      </Card>
    </div>
  )
}

const SKELETON_ROWS = 6

export function TransactionListSkeleton() {
  return (
    <Card padding="none">
      <div role="status" className={styles.skeleton}>
        <span className="visually-hidden">Loading transactions</span>
        <div className={styles.day}>
          <Skeleton className={styles.dayLine} />
        </div>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div key={i} className={styles.skeletonRow} aria-hidden>
            <Skeleton shape="circle" className={styles.skeletonIcon} />
            <span className={styles.skeletonText}>
              <Skeleton className={styles.lineLong} />
              <Skeleton className={styles.lineMedium} />
            </span>
            <span className={styles.skeletonEnd}>
              <Skeleton className={styles.lineShort} />
              <Skeleton className={styles.lineTiny} />
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
