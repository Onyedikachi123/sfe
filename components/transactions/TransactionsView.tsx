'use client'
import { useCallback } from 'react'
import { Button, Card, EmptyState, Skeleton } from '@/components/ui'
import {
  hasActiveFilters,
  hasInvalidDateRange,
  withFilters,
  withoutFilters,
  type TransactionsState,
} from '@/lib/transactions/query-state'
import { useTransactions } from '@/lib/transactions/queries'
import { TransactionList, TransactionListSkeleton } from './TransactionList'
import { TransactionsFilters, TransactionsFiltersSkeleton } from './TransactionsFilters'
import { useSearchDraft } from './useSearchDraft'
import { useTransactionsUrl } from './useTransactionsUrl'
import styles from './TransactionsView.module.css'

const countFormatter = new Intl.NumberFormat('en-GB')

/** "237 transactions" for the whole history; "3 results" once anything narrows it. */
function countLabel(total: number, filtered: boolean) {
  const noun = filtered ? (total === 1 ? 'result' : 'results') : total === 1 ? 'transaction' : 'transactions'
  return `${countFormatter.format(total)} ${noun}`
}

/** Everything below the page title. Reads the URL, so it renders inside a Suspense boundary. */
export function TransactionsView() {
  const { state, navigate } = useTransactionsUrl()
  const commitSearch = useCallback(
    (q: string) => navigate(withFilters(state, { q }), 'replace'),
    [state, navigate]
  )
  const [search, setSearch] = useSearchDraft(state.q, commitSearch)
  const query = useTransactions(state)

  const filtered = hasActiveFilters(state)
  // A backwards range never fetches, so it stays "pending" forever; don't show a skeleton for it.
  const isLoading = query.isPending && !hasInvalidDateRange(state)
  const clearFilters = () => {
    setSearch('')
    navigate(withoutFilters(state))
  }

  return (
    <>
      <p className={styles.subtitle}>
        {query.data
          ? countLabel(query.data.meta.total, filtered)
          : isLoading && <Skeleton className={styles.subtitleSkeleton} />}
      </p>

      <div className={styles.filters}>
        <TransactionsFilters
          search={search}
          onSearchChange={setSearch}
          type={state.type}
          onTypeChange={(type) => navigate(withFilters(state, { type }))}
          status={state.status}
          onStatusChange={(status) => navigate(withFilters(state, { status }))}
          onClear={filtered ? clearFilters : undefined}
        />
      </div>

      <TransactionsContent
        state={state}
        query={query}
        filtered={filtered}
        onClearFilters={clearFilters}
        navigate={navigate}
      />
    </>
  )
}

interface TransactionsContentProps {
  state: TransactionsState
  query: ReturnType<typeof useTransactions>
  filtered: boolean
  onClearFilters: () => void
  navigate: ReturnType<typeof useTransactionsUrl>['navigate']
}

function TransactionsContent({ state, query, filtered, onClearFilters, navigate }: TransactionsContentProps) {
  // Only reachable from a hand-edited URL: the page has no date inputs. Never fetched (see useTransactions).
  if (hasInvalidDateRange(state)) {
    return (
      <Card padding="none">
        <EmptyState
          icon="alert"
          title="This date range isn't valid"
          description="The start date is after the end date."
          action={
            <Button
              variant="secondary"
              onClick={() => navigate(withFilters(state, { from: null, to: null }))}
            >
              Clear dates
            </Button>
          }
        />
      </Card>
    )
  }

  if (query.isError && !query.data) {
    return (
      <Card padding="none">
        <EmptyState
          icon="alert"
          tone="danger"
          role="alert"
          title="We couldn't load your transactions"
          description="Check your connection and try again."
          action={
            <Button iconLeft="refresh" onClick={() => void query.refetch()} disabled={query.isFetching}>
              Try again
            </Button>
          }
        />
      </Card>
    )
  }

  if (!query.data) return <TransactionListSkeleton />

  if (query.data.data.length === 0) {
    return (
      <Card padding="none">
        {filtered ? (
          <EmptyState
            icon="search"
            role="status"
            title="No transactions match your filters"
            description="Try a different search term or remove some filters."
            action={
              <Button variant="secondary" onClick={onClearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon="inbox"
            role="status"
            title="No transactions yet"
            description="When you add money, send a transfer or pay with your card, it will show up here."
          />
        )}
      </Card>
    )
  }

  return (
    <TransactionList
      transactions={query.data.data}
      // When the data was fetched, not "now" at render: keeps rendering pure, and matches what the
      // server meant by "today" closely enough for a list that refetches every 30 s at most.
      now={new Date(query.dataUpdatedAt)}
      isStale={query.isPlaceholderData}
    />
  )
}

/** Suspense fallback: the same layout as the loaded page, so nothing jumps when it hydrates. */
export function TransactionsViewSkeleton() {
  return (
    <>
      <p className={styles.subtitle}>
        <Skeleton className={styles.subtitleSkeleton} />
      </p>
      <div className={styles.filters}>
        <TransactionsFiltersSkeleton />
      </div>
      <TransactionListSkeleton />
    </>
  )
}
