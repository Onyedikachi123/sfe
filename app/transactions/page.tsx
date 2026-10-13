import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TransactionsView, TransactionsViewSkeleton } from '@/components/transactions'
import styles from './page.module.css'

export const metadata: Metadata = { title: 'Transactions' }

export default function TransactionsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Transactions</h1>
      {/* The view reads the URL (useSearchParams), so a static build needs this boundary; the
          title above stays in the prerendered HTML. */}
      <Suspense fallback={<TransactionsViewSkeleton />}>
        <TransactionsView />
      </Suspense>
    </div>
  )
}
