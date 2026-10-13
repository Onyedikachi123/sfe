'use client'
import { useCallback, useEffect, useRef } from 'react'
import { Button, Card, EmptyState, Pagination, Skeleton } from '@/components/ui'
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

  // The API answers a page past the end with 200 and no rows; send the user to the last real page
  // instead of showing an empty list. Placeholder data belongs to the previous query, so skip it.
  const meta = query.data?.meta
  const isOutOfRange = Boolean(meta && !query.isPlaceholderData && meta.page > meta.totalPages)
  useEffect(() => {
    if (isOutOfRange && meta) navigate({ ...state, page: meta.totalPages }, 'replace')
  }, [isOutOfRange, meta, state, navigate])

  const resultsRef = useRef<HTMLDivElement>(null)
  const goToPage = (page: number) => {
    navigate({ ...state, page, txn: null })
    // Bring the top of the list back into view, but only if it has scrolled away; scroll-margin-top
    // accounts for the sticky navbar.
    const results = resultsRef.current
    if (!results) return
    const margin = parseFloat(getComputedStyle(results).scrollMarginTop) || 0
    if (results.getBoundingClientRect().top < margin) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      results.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })
    }
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

      <div ref={resultsRef} className={styles.results}>
        <TransactionsContent
          state={state}
          query={query}
          filtered={filtered}
          isOutOfRange={isOutOfRange}
          onClearFilters={clearFilters}
          onPageChange={goToPage}
          navigate={navigate}
        />
      </div>
    </>
  )
}

interface TransactionsContentProps {
  state: TransactionsState
  query: ReturnType<typeof useTransactions>
  filtered: boolean
  isOutOfRange: boolean
  onClearFilters: () => void
  onPageChange: (page: number) => void
  navigate: ReturnType<typeof useTransactionsUrl>['navigate']
}

function TransactionsContent({
  state,
  query,
  filtered,
  isOutOfRange,
  onClearFilters,
  onPageChange,
  navigate,
}: TransactionsContentProps) {
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

  // Keep loading, not "no results", while a page is clamped or while the result being kept on
  // screen is an empty one from the previous query.
  const rows = query.data.data
  if (isOutOfRange || (query.isPlaceholderData && rows.length === 0)) return <TransactionListSkeleton />

  if (rows.length === 0) {
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

  const { page, limit, total, totalPages } = query.data.meta
  const first = (page - 1) * limit + 1
  return (
    <>
      <TransactionList
        transactions={rows}
        // When the data was fetched, not "now" at render: keeps rendering pure, and matches what the
        // server meant by "today" closely enough for a list that refetches every 30 s at most.
        now={new Date(query.dataUpdatedAt)}
        isStale={query.isPlaceholderData}
      />
      <div className={styles.footer}>
        <p className={styles.range}>
          Showing {first}–{first + rows.length - 1} of {countFormatter.format(total)}
        </p>
        {/* The URL's page, so the pager reacts at once while the previous rows stay on screen. */}
        <Pagination page={state.page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </>
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
