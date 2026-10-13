import type { Transaction } from '@/types/api'
import { formatDate } from '@/lib/format'

export interface DayGroup {
  /** Local calendar day, YYYY-MM-DD; stable React key. */
  key: string
  /** "Today", "Yesterday" or e.g. "Mon, 5 Oct 2026". */
  label: string
  transactions: Transaction[]
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The calendar day in the user's own time zone, which is how dates are displayed. */
const localDayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/**
 * Groups an already-sorted page of transactions under day headings, in the user's local time.
 * `now` is passed in (rather than read here) so rendering stays pure and tests are deterministic.
 * Consecutive rows only: the API returns newest first, so each day appears once per page.
 */
export function groupByDay(transactions: readonly Transaction[], now: Date): DayGroup[] {
  const today = localDayKey(now)
  const yesterday = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))

  const groups: DayGroup[] = []
  for (const tx of transactions) {
    const key = localDayKey(new Date(tx.createdAt))
    const last = groups[groups.length - 1]
    if (last?.key === key) {
      last.transactions.push(tx)
      continue
    }
    const label = key === today ? 'Today' : key === yesterday ? 'Yesterday' : formatDate(tx.createdAt)
    groups.push({ key, label, transactions: [tx] })
  }
  return groups
}
