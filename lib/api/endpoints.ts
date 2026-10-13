import type {
  Conversion,
  Currency,
  Paginated,
  Rate,
  Transaction,
  TransactionStatus,
  TransactionType,
  User,
} from '@/types/api'
import { api, ApiError, GENERIC_MESSAGE } from './client'

export interface TransactionQuery {
  page?: number
  limit?: number
  type?: TransactionType
  status?: TransactionStatus
  currency?: Currency
  q?: string
  /** YYYY-MM-DD, inclusive, UTC */
  from?: string
  /** YYYY-MM-DD, inclusive, UTC */
  to?: string
}

function toSearchParams(query: object): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const getMe = (init?: RequestInit) => api.get<User>('/me', init)

export async function getTransactions(
  query: TransactionQuery = {},
  init?: RequestInit
): Promise<Paginated<Transaction>> {
  const { data, meta } = await api.get<Transaction[]>(`/transactions${toSearchParams(query)}`, init)
  // Pagination can't work without meta, so a list response missing it is a broken response.
  if (!meta) throw new ApiError(200, 'UNKNOWN', GENERIC_MESSAGE)
  return { data, meta }
}

export const getTransaction = (id: string, init?: RequestInit) =>
  api.get<Transaction>(`/transactions/${encodeURIComponent(id)}`, init)

export const getRate = (from: Currency, to: Currency, init?: RequestInit) =>
  api.get<Rate>(`/rates${toSearchParams({ from, to })}`, init)

export const convert = (body: { from: Currency; to: Currency; amount: number }) =>
  api.post<Conversion>('/convert', body)
