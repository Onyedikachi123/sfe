import type { TransactionStatus, TransactionType } from '@/types/api'
import { TRANSACTION_STATUSES, TRANSACTION_TYPES } from '@/types/api'
import { Button, Input, Select, Skeleton } from '@/components/ui'
import { TRANSACTION_STATUS_LABELS, TRANSACTION_TYPE_LABELS } from '@/lib/format'
import styles from './TransactionsFilters.module.css'

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  ...TRANSACTION_TYPES.map((type) => ({ value: type, label: TRANSACTION_TYPE_LABELS[type] })),
]

// The design also lists "Reversed", but the API has no such status (API.md, types/api.ts), so it
// is left out rather than offered as a filter that can only ever return nothing.
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...TRANSACTION_STATUSES.map((status) => ({ value: status, label: TRANSACTION_STATUS_LABELS[status] })),
]

export interface TransactionsFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  type: TransactionType | null
  onTypeChange: (type: TransactionType | null) => void
  status: TransactionStatus | null
  onStatusChange: (status: TransactionStatus | null) => void
  /** Shown whenever any filter or search is applied. */
  onClear?: () => void
}

export function TransactionsFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
  status,
  onStatusChange,
  onClear,
}: TransactionsFiltersProps) {
  return (
    <div className={styles.filters} role="search">
      <Input
        label="Search"
        type="search"
        leadingIcon="search"
        placeholder="Search by reference, name or narration"
        autoComplete="off"
        enterKeyHint="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        fieldClassName={styles.search}
      />
      <Select
        label="Type"
        options={TYPE_OPTIONS}
        value={type ?? ''}
        // Option values come from TRANSACTION_TYPES, so '' is the only non-type value possible.
        onChange={(event) => onTypeChange((event.target.value || null) as TransactionType | null)}
      />
      <Select
        label="Status"
        options={STATUS_OPTIONS}
        value={status ?? ''}
        onChange={(event) => onStatusChange((event.target.value || null) as TransactionStatus | null)}
      />
      {onClear && (
        <Button variant="ghost" onClick={onClear} className={styles.clear}>
          Clear filters
        </Button>
      )}
    </div>
  )
}

/** Same grid as the real filter bar, so nothing moves when it hydrates. */
export function TransactionsFiltersSkeleton() {
  return (
    <div className={styles.filters} aria-hidden>
      {['search', 'type', 'status'].map((field) => (
        <div key={field} className={field === 'search' ? styles.search : undefined}>
          <Skeleton className={styles.labelSkeleton} />
          <Skeleton className={styles.controlSkeleton} />
        </div>
      ))}
    </div>
  )
}
