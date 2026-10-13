// Domain types for the Acme API. Keep in sync with API.md.

export type Currency = 'NGN' | 'USD' | 'GHS'

export const CURRENCIES: readonly Currency[] = ['NGN', 'USD', 'GHS']

export type TransactionType =
  'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'conversion' | 'card_payment' | 'bill_payment'

export type TransactionStatus = 'successful' | 'pending' | 'failed'

export const TRANSACTION_TYPES = [
  'deposit',
  'withdrawal',
  'transfer_in',
  'transfer_out',
  'conversion',
  'card_payment',
  'bill_payment',
] as const satisfies readonly TransactionType[]

export const TRANSACTION_STATUSES = [
  'successful',
  'pending',
  'failed',
] as const satisfies readonly TransactionStatus[]

export interface Transaction {
  id: string
  reference: string
  type: TransactionType
  status: TransactionStatus
  currency: Currency
  /** Minor units (kobo / cents / pesewas). Always positive. */
  amount: number
  /** Minor units. */
  fee: number
  /** From upstream providers. Not sanitised. */
  narration: string
  counterparty: string | null
  /** ISO 8601, UTC */
  createdAt: string
}

export interface Wallet {
  currency: Currency
  /** Minor units. */
  balance: number
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
  tier: 'basic' | 'verified' | 'premium'
  wallets: Wallet[]
}

export interface Rate {
  from: Currency
  to: Currency
  rate: number
  updatedAt: string
}

export interface Conversion {
  id: string
  from: Currency
  to: Currency
  amount: number
  fee: number
  rate: number
  received: number
  status: TransactionStatus
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiSuccess<T> {
  data: T
  meta?: PageMeta
}

/** A list response; unlike ApiSuccess, `meta` is guaranteed. */
export interface Paginated<T> {
  data: T[]
  meta: PageMeta
}

export interface ApiErrorBody {
  error: { code: string; message: string }
}
