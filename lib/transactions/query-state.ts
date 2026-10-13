/**
 * The Transactions page keeps all of its state in the URL. These functions are the boundary
 * between that untrusted query string and the rest of the page: anything that doesn't validate is
 * dropped here, so nothing downstream ever sees (or sends to the API) a value the API would
 * reject or silently misread.
 */
import type { TransactionQuery } from '@/lib/api/endpoints'
import {
  CURRENCIES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type Currency,
  type TransactionStatus,
  type TransactionType,
} from '@/types/api'

export const PAGE_SIZE = 20

/** Longer search terms are cut; nobody types more, and it keeps URLs and requests bounded. */
export const MAX_QUERY_LENGTH = 100

/** Read by the mock API from the page URL (via Referer); carried through untouched. */
const SCENARIO_PARAM = '__scenario'

export interface TransactionsState {
  /** Trimmed search term; '' means no search. */
  q: string
  type: TransactionType | null
  status: TransactionStatus | null
  currency: Currency | null
  /** YYYY-MM-DD, inclusive, UTC (per API.md). */
  from: string | null
  /** YYYY-MM-DD, inclusive, UTC (per API.md). */
  to: string | null
  /** 1-based. */
  page: number
  /** Id of the transaction open in the details drawer. */
  txn: string | null
  /** Mock-API test scenario, preserved so it survives URL rewrites. Not page state. */
  scenario: string | null
}

export const DEFAULT_STATE: TransactionsState = {
  q: '',
  type: null,
  status: null,
  currency: null,
  from: null,
  to: null,
  page: 1,
  txn: null,
  scenario: null,
}

function oneOf<T extends string>(allowed: readonly T[], value: string | null): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

/**
 * A real calendar date in YYYY-MM-DD. Date parsing alone is not enough: `Date.parse` rolls
 * 2026-02-30 over to 2 March, which is exactly what the API does, so round-trip it instead.
 */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function parseDate(value: string | null): string | null {
  return value !== null && isIsoDate(value) ? value : null
}

/** Digits only: Number() would also accept "1e1", "0x2", "2.0" and " 3 ". */
function parsePage(value: string | null): number {
  if (value === null || !/^[1-9]\d*$/.test(value)) return DEFAULT_STATE.page
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : DEFAULT_STATE.page
}

/** Ids are opaque, but they are short and URL-safe; anything else can't be a real one. */
function parseTxn(value: string | null): string | null {
  return value !== null && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null
}

/** The form a search term takes in the URL; the search box uses it to know when it is in sync. */
export function normalizeSearch(value: string | null): string {
  return (value ?? '').trim().slice(0, MAX_QUERY_LENGTH).trim()
}

export function parseTransactionsSearchParams(params: Pick<URLSearchParams, 'get'>): TransactionsState {
  return {
    q: normalizeSearch(params.get('q')),
    type: oneOf(TRANSACTION_TYPES, params.get('type')),
    status: oneOf(TRANSACTION_STATUSES, params.get('status')),
    currency: oneOf(CURRENCIES, params.get('currency')),
    from: parseDate(params.get('from')),
    to: parseDate(params.get('to')),
    page: parsePage(params.get('page')),
    txn: parseTxn(params.get('txn')),
    scenario: params.get(SCENARIO_PARAM) || null,
  }
}

/**
 * Serialises state for the URL. Defaults are left out and keys always come in the same order, so
 * equal states produce equal URLs (no needless navigations, stable cache keys, tidy shared links).
 */
export function toSearchParams(state: TransactionsState): URLSearchParams {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  if (state.type) params.set('type', state.type)
  if (state.status) params.set('status', state.status)
  if (state.currency) params.set('currency', state.currency)
  if (state.from) params.set('from', state.from)
  if (state.to) params.set('to', state.to)
  if (state.page !== DEFAULT_STATE.page) params.set('page', String(state.page))
  if (state.txn) params.set('txn', state.txn)
  if (state.scenario) params.set(SCENARIO_PARAM, state.scenario)
  return params
}

type Filters = Pick<TransactionsState, 'q' | 'type' | 'status' | 'currency' | 'from' | 'to'>

/** Whether the list is narrowed at all; drives "Clear filters" and "results" vs "transactions". */
export const hasActiveFilters = (state: TransactionsState): boolean =>
  Boolean(state.q || state.type || state.status || state.currency || state.from || state.to)

/**
 * Applies a filter or search change. Any change of what the list contains starts again at page 1
 * and closes the details drawer, whose row may no longer be in the list.
 */
export const withFilters = (state: TransactionsState, patch: Partial<Filters>): TransactionsState => ({
  ...state,
  ...patch,
  page: DEFAULT_STATE.page,
  txn: null,
})

/** Removes every filter and the search, keeping only what isn't page state (the mock scenario). */
export const withoutFilters = (state: TransactionsState): TransactionsState => ({
  ...DEFAULT_STATE,
  scenario: state.scenario,
})

/** Both dates are valid on their own but the range is backwards; the page must not fetch. */
export const hasInvalidDateRange = ({ from, to }: Pick<TransactionsState, 'from' | 'to'>): boolean =>
  from !== null && to !== null && from > to

/** The list request for this state. `txn` and `scenario` don't affect the list. */
export function toApiQuery(state: TransactionsState): TransactionQuery {
  return {
    page: state.page,
    limit: PAGE_SIZE,
    q: state.q || undefined,
    type: state.type ?? undefined,
    status: state.status ?? undefined,
    currency: state.currency ?? undefined,
    from: state.from ?? undefined,
    to: state.to ?? undefined,
  }
}
