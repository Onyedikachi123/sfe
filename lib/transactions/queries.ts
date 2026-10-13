import {
  keepPreviousData,
  skipToken,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useState } from 'react'
import type { Paginated, Transaction } from '@/types/api'
import { ApiError } from '@/lib/api/client'
import { getTransaction, getTransactions, type TransactionQuery } from '@/lib/api/endpoints'
import { retryOnceOnServerError } from '@/lib/api/retry'
import { hasInvalidDateRange, toApiQuery, type TransactionsState } from './query-state'

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  /** Keyed by the whole API query, so every filter/page combination is cached separately. */
  list: (query: TransactionQuery) => [...transactionKeys.lists(), query] as const,
  detail: (id: string) => [...transactionKeys.all, 'detail', id] as const,
}

export const isNotFoundError = (error: unknown): boolean => error instanceof ApiError && error.status === 404

/**
 * The list for the current URL state. Responses are cached per query key, so a slow, stale search
 * can never overwrite a newer one; the signal lets TanStack Query abort requests nobody is waiting
 * for. While the next page or filter loads, the previous rows stay on screen (`isPlaceholderData`).
 * A backwards date range never fetches: the page shows a validation message instead.
 *
 * `lastLoaded` is the most recent successful response for any query. TanStack Query only keeps
 * previous data while the next request is pending; once it fails, `data` is gone. Keeping the last
 * good result lets the page leave it on screen under an inline error instead of blanking it.
 */
export function useTransactions(state: TransactionsState) {
  const query = toApiQuery(state)
  const result = useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: hasInvalidDateRange(state) ? skipToken : ({ signal }) => getTransactions(query, { signal }),
    placeholderData: keepPreviousData,
    retry: retryOnceOnServerError,
  })

  const [lastLoaded, setLastLoaded] = useState<Paginated<Transaction>>()
  // Adjusting state while rendering (React's pattern for deriving from changing input) rather than
  // in an effect, so there is never a render with the new error but without the kept data.
  if (result.data && !result.isPlaceholderData && result.data !== lastLoaded) setLastLoaded(result.data)

  return { ...result, lastLoaded }
}

/** A row from any list already in the cache, with when that list was fetched. */
function findCachedRow(queryClient: QueryClient, id: string) {
  const lists = queryClient.getQueryCache().findAll({ queryKey: transactionKeys.lists() })
  for (const list of lists) {
    const row = (list.state.data as Paginated<Transaction> | undefined)?.data.find((tx) => tx.id === id)
    if (row) return { row, updatedAt: list.state.dataUpdatedAt }
  }
  return undefined
}

/**
 * One transaction for the details drawer. Opening a row that is already on screen renders
 * instantly from the list cache (and only refetches once that copy is stale); a deep link or a
 * refresh fetches it. A 404 is a final answer — never retried — exposed as `isNotFound`.
 */
export function useTransaction(id: string | null) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: transactionKeys.detail(id ?? ''),
    queryFn: id ? async ({ signal }) => (await getTransaction(id, { signal })).data : skipToken,
    initialData: () => (id ? findCachedRow(queryClient, id)?.row : undefined),
    initialDataUpdatedAt: () => (id ? findCachedRow(queryClient, id)?.updatedAt : undefined),
    retry: retryOnceOnServerError,
  })
  return { ...query, isNotFound: isNotFoundError(query.error) }
}
