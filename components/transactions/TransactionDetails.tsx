'use client'
import { useId, useState, type ReactNode } from 'react'
import type { Transaction } from '@/types/api'
import { Button, Money, Skeleton } from '@/components/ui'
import { cx } from '@/lib/cx'
import { formatDateTime, TRANSACTION_TYPE_LABELS } from '@/lib/format'
import { isCredit } from '@/lib/transactions/direction'
import { StatusBadge } from './StatusBadge'
import { TransactionAvatar } from './TransactionAvatar'
import styles from './TransactionDetails.module.css'

/** "Transfer out to Kwame Mensah" for transfers, as in the design; otherwise the narration. */
function headline(tx: Transaction) {
  if (!tx.counterparty) return tx.narration
  const preposition = tx.type === 'transfer_in' ? 'from' : 'to'
  return `${TRANSACTION_TYPE_LABELS[tx.type]} ${preposition} ${tx.counterparty}`
}

export function TransactionDetails({ transaction: tx }: { transaction: Transaction }) {
  const credit = isCredit(tx.type)
  const id = useId()

  return (
    <div className={styles.details}>
      <div className={styles.hero}>
        <TransactionAvatar transaction={tx} size="lg" />
        <p className={styles.headline}>{headline(tx)}</p>
        <Money
          amount={tx.amount}
          currency={tx.currency}
          sign={credit ? 'credit' : 'debit'}
          className={cx(styles.amount, credit && styles.credit)}
        />
        <StatusBadge status={tx.status} />
      </div>

      <section aria-labelledby={`${id}-details`}>
        <h3 id={`${id}-details`} className={styles.sectionTitle}>
          Details
        </h3>
        <dl className={styles.list}>
          <Row label="Reference">
            <span className={styles.reference}>
              <span className={styles.mono}>{tx.reference}</span>
              <CopyButton value={tx.reference} label="Copy reference" />
            </span>
          </Row>
          <Row label="Date">{formatDateTime(tx.createdAt)}</Row>
          <Row label="Type">{TRANSACTION_TYPE_LABELS[tx.type]}</Row>
          {tx.counterparty && <Row label="Counterparty">{tx.counterparty}</Row>}
          <Row label="Narration">
            <span className={styles.wrap}>{tx.narration}</span>
          </Row>
        </dl>
      </section>

      <section aria-labelledby={`${id}-summary`}>
        <h3 id={`${id}-summary`} className={styles.sectionTitle}>
          Summary
        </h3>
        <dl className={styles.list}>
          <Row label="Amount">
            <Money amount={tx.amount} currency={tx.currency} />
          </Row>
          <Row label="Fee">
            <Money amount={tx.fee} currency={tx.currency} />
          </Row>
          {/* The fee is charged on top of the amount (API.md), so a debit costs amount + fee. A
              credit's fee isn't added to what arrived (a conversion's fee was paid on the sending
              side), so a total would mislead; it is left out. */}
          {!credit && (
            <Row label="Total" emphasis>
              <Money amount={tx.amount + tx.fee} currency={tx.currency} />
            </Row>
          )}
        </dl>
      </section>
    </div>
  )
}

function Row({
  label,
  emphasis = false,
  children,
}: {
  label: string
  emphasis?: boolean
  children: ReactNode
}) {
  return (
    <div className={cx(styles.row, emphasis && styles.total)}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

type CopyState = 'idle' | 'copied' | 'failed'

const COPY_FEEDBACK: Record<Exclude<CopyState, 'idle'>, string> = {
  copied: 'Copied',
  failed: "Couldn't copy",
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<CopyState>('idle')

  const copy = async () => {
    try {
      // Unavailable outside secure contexts and in some embedded browsers.
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        iconLeft="copy"
        aria-label={label}
        onClick={copy}
        className={styles.copy}
      />
      <span role="status" className={cx(styles.copyFeedback, state === 'idle' && 'visually-hidden')}>
        {state === 'idle' ? '' : COPY_FEEDBACK[state]}
      </span>
    </>
  )
}

export function TransactionDetailsSkeleton() {
  return (
    <div className={styles.details} role="status">
      <span className="visually-hidden">Loading transaction</span>
      <div className={styles.hero} aria-hidden>
        <Skeleton shape="circle" className={styles.skeletonAvatar} />
        <Skeleton className={styles.skeletonHeadline} />
        <Skeleton className={styles.skeletonAmount} />
        <Skeleton className={styles.skeletonBadge} />
      </div>
      <div className={styles.list} aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={styles.row}>
            <Skeleton className={styles.skeletonLabel} />
            <Skeleton className={styles.skeletonValue} />
          </div>
        ))}
      </div>
    </div>
  )
}
