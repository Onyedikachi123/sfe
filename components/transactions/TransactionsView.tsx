'use client'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { Transaction } from '@/types/api'
import { Alert, Button, Card, Drawer, EmptyState, Pagination, Skeleton } from '@/components/ui'
import {
  hasActiveFilters,
  hasInvalidDateRange,
  withFilters,
  withoutFilters,
  type TransactionsState,
} from '@/lib/transactions/query-state'
import { useTransaction, useTransactions } from '@/lib/transactions/queries'
import { TransactionDetails, TransactionDetailsSkeleton } from './TransactionDetails'
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
  const { state, navigate, back } = useTransactionsUrl()
  const commitSearch = useCallback(
    (q: string) => navigate(withFilters(state, { q }), 'replace'),
    [state, navigate]
  )
  const [search, setSearch] = useSearchDraft(state.q, commitSearch)
  const query = useTransactions(state)

  const filtered = hasActiveFilters(state)
  // A backwards range never fetches, so it stays "pending" forever; don't show a skeleton for it.
  const isLoading = query.isPending && !hasInvalidDateRange(state)
  // If the latest request failed, keep showing the last results that did load (see useTransactions).
  const shown = query.data ?? (query.isError ? query.lastLoaded : undefined)
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

  // Opening details pushes a history entry, so closing it should step back over that entry rather
  // than add another (or Back would reopen the drawer). A drawer that came from a link or a refresh
  // has no entry of ours behind it, so it closes by replacing the URL instead.
  const pushedDetails = useRef(false)
  const openDetails = (tx: Transaction) => {
    pushedDetails.current = true
    navigate({ ...state, txn: tx.id })
  }
  const closeDetails = () => {
    if (pushedDetails.current) {
      pushedDetails.current = false
      back()
    } else {
      navigate({ ...state, txn: null }, 'replace')
    }
  }

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
      {/* The one polite live region for the list: announces loading, then the new count. */}
      <p className={styles.subtitle} aria-live="polite" aria-atomic="true">
        {shown ? (
          countLabel(shown.meta.total, filtered)
        ) : isLoading ? (
          <>
            <Skeleton className={styles.subtitleSkeleton} />
            <span className="visually-hidden">Loading transactions</span>
          </>
        ) : null}
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
          onSelect={openDetails}
          navigate={navigate}
        />
      </div>

      <TransactionDrawer id={state.txn} onClose={closeDetails} />
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
  onSelect: (transaction: Transaction) => void
  navigate: ReturnType<typeof useTransactionsUrl>['navigate']
}

function TransactionsContent({
  state,
  query,
  filtered,
  isOutOfRange,
  onClearFilters,
  onPageChange,
  onSelect,
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

  const data = query.data ?? (query.isError ? query.lastLoaded : undefined)

  if (query.isError && !data) {
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

  if (!data) return <TransactionListSkeleton />

  // Keep loading, not "no results", while a page is clamped or while the result being kept on
  // screen is an empty one from the previous query.
  const rows = data.data
  if (isOutOfRange || (query.isPlaceholderData && rows.length === 0)) return <TransactionListSkeleton />

  // Shown above kept results when a later request failed: they stay usable, the failure is explained.
  const staleError = query.isError && (
    <Alert
      className={styles.inlineError}
      action={
        <Button
          size="sm"
          variant="secondary"
          iconLeft="refresh"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          Try again
        </Button>
      }
    >
      We couldn&apos;t load the latest results. Showing what loaded before.
    </Alert>
  )

  if (rows.length === 0) {
    return (
      <>
        {staleError}
        <Card padding="none">
          {filtered ? (
            <EmptyState
              icon="search"
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
              title="No transactions yet"
              description="When you add money, send a transfer or pay with your card, it will show up here."
            />
          )}
        </Card>
      </>
    )
  }

  const { page, limit, total, totalPages } = data.meta
  const first = (page - 1) * limit + 1
  return (
    <>
      {staleError}
      <TransactionList
        transactions={rows}
        // When the data was fetched, not "now" at render: keeps rendering pure, and matches what the
        // server meant by "today" closely enough for a list that refetches every 30 s at most.
        now={new Date(query.dataUpdatedAt)}
        isStale={query.isPlaceholderData}
        onSelect={onSelect}
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

/**
 * Details for the transaction in the URL. Opening a row on screen renders instantly from the list
 * cache; a link or refresh fetches it (useTransaction), so it works whatever page is showing.
 */
function TransactionDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const query = useTransaction(id)

  let body: ReactNode
  // Not found wins over a cached copy: the row may have been on a list fetched before it went away.
  if (query.isNotFound) {
    body = (
      <EmptyState
        icon="search"
        role="status"
        title="Transaction not found"
        description="It may have been removed, or the link is wrong."
        action={
          <Button variant="secondary" onClick={onClose}>
            Back to transactions
          </Button>
        }
      />
    )
  } else if (query.data) {
    body = <TransactionDetails transaction={query.data} />
  } else if (query.isError) {
    body = (
      <EmptyState
        icon="alert"
        tone="danger"
        role="alert"
        title="We couldn't load this transaction"
        description="Check your connection and try again."
        action={
          <Button iconLeft="refresh" onClick={() => void query.refetch()} disabled={query.isFetching}>
            Try again
          </Button>
        }
      />
    )
  } else {
    body = <TransactionDetailsSkeleton />
  }

  return (
    <Drawer open={id !== null} title="Transaction details" onClose={onClose}>
      {body}
    </Drawer>
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
