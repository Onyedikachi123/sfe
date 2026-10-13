'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import {
  parseTransactionsSearchParams,
  toSearchParams,
  type TransactionsState,
} from '@/lib/transactions/query-state'

export type NavigationMode = 'push' | 'replace'

/**
 * The Transactions page state, read from and written to the URL. `push` for deliberate changes the
 * user may want to undo with Back (filters, page, details); `replace` for ones that shouldn't each
 * leave a history entry (typing in search, cleaning up the URL).
 */
export function useTransactionsUrl() {
  const router = useRouter()
  const pathname = usePathname()
  const current = useSearchParams().toString()
  const state = useMemo(() => parseTransactionsSearchParams(new URLSearchParams(current)), [current])

  const navigate = useCallback(
    (next: TransactionsState, mode: NavigationMode = 'push') => {
      const query = toSearchParams(next).toString()
      if (query === current) return
      router[mode](query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname, current]
  )

  // A hand-edited or old link may carry invalid or unknown params; show the URL the page is
  // actually using, without adding a history entry.
  useEffect(() => {
    const canonical = toSearchParams(state).toString()
    if (canonical !== current)
      router.replace(canonical ? `${pathname}?${canonical}` : pathname, { scroll: false })
  }, [state, current, router, pathname])

  return { state, navigate }
}
