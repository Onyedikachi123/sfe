'use client'
import { useEffect, useState } from 'react'
import { normalizeSearch } from '@/lib/transactions/query-state'

export const SEARCH_DEBOUNCE_MS = 300

/**
 * The search box's text, kept separate from the URL so typing stays instant while the URL (and
 * the request) only updates once the user pauses.
 *
 * The box follows the URL when `q` changes for any other reason (Back/Forward, a link, "Clear
 * filters"), but not when the change is the echo of its own debounced write — otherwise anything
 * typed while that navigation is in flight would be wiped.
 */
export function useSearchDraft(urlQuery: string, commit: (query: string) => void) {
  const [draft, setDraft] = useState(urlQuery)
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)
  const [pendingQuery, setPendingQuery] = useState<string | null>(null)

  // Adjusting state while rendering (not in an effect) avoids rendering one frame of stale text.
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    if (urlQuery === pendingQuery) setPendingQuery(null)
    else setDraft(urlQuery)
  }

  useEffect(() => {
    const next = normalizeSearch(draft)
    if (next === urlQuery) return
    const timer = setTimeout(() => {
      setPendingQuery(next)
      commit(next)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, urlQuery, commit])

  return [draft, setDraft] as const
}
