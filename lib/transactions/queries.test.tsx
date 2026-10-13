import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { Paginated, Transaction } from '@/types/api'
import { ApiError } from '@/lib/api/client'
import { getTransaction, getTransactions } from '@/lib/api/endpoints'
import { DEFAULT_STATE, PAGE_SIZE, type TransactionsState } from './query-state'
import { transactionKeys, useTransaction, useTransactions } from './queries'

vi.mock('@/lib/api/endpoints', () => ({ getTransactions: vi.fn(), getTransaction: vi.fn() }))

const listMock = vi.mocked(getTransactions)
const detailMock = vi.mocked(getTransaction)

const tx = (id: string): Transaction => ({
  id,
  reference: `ACM-${id}`,
  type: 'deposit',
  status: 'successful',
  currency: 'NGN',
  amount: 150050,
  fee: 0,
  narration: 'Wallet top-up via bank transfer',
  counterparty: null,
  createdAt: '2026-09-30T14:22:00.000Z',
})

const page = (n: number, ids: string[]): Paginated<Transaction> => ({
  data: ids.map(tx),
  meta: { page: n, limit: PAGE_SIZE, total: 237, totalPages: 12 },
})

const serverError = () => new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.')

let queryClient: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, staleTime: 30_000 } } })
})

afterEach(() => {
  queryClient.clear()
  vi.resetAllMocks()
})

describe('useTransactions', () => {
  it('requests the API query for the state and passes an AbortSignal', async () => {
    listMock.mockResolvedValue(page(2, ['a']))
    const state: TransactionsState = { ...DEFAULT_STATE, q: 'net', status: 'failed', page: 2, txn: 'x' }

    const { result } = renderHook(() => useTransactions(state), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.meta.page).toBe(2)
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: PAGE_SIZE, q: 'net', status: 'failed' }),
      { signal: expect.any(AbortSignal) }
    )
  })

  it('caches each query separately, keyed by the full API query', async () => {
    listMock.mockResolvedValue(page(1, ['a']))
    const { result } = renderHook(() => useTransactions({ ...DEFAULT_STATE, currency: 'USD' }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const cached = queryClient.getQueryData(
      transactionKeys.list({ page: 1, limit: PAGE_SIZE, currency: 'USD' })
    )
    expect(cached).toEqual(page(1, ['a']))
  })

  it('keeps the previous page on screen while the next one loads', async () => {
    let resolvePage2: (value: Paginated<Transaction>) => void = () => {}
    listMock
      .mockResolvedValueOnce(page(1, ['a']))
      .mockReturnValueOnce(new Promise((resolve) => (resolvePage2 = resolve)))

    const { result, rerender } = renderHook((state: TransactionsState) => useTransactions(state), {
      wrapper,
      initialProps: DEFAULT_STATE,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ ...DEFAULT_STATE, page: 2 })
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.data.map((row) => row.id)).toEqual(['a'])

    resolvePage2(page(2, ['b']))
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))
    expect(result.current.data?.data.map((row) => row.id)).toEqual(['b'])
  })

  it('aborts the superseded request when the query changes, so a slow search cannot land late', async () => {
    const signals: AbortSignal[] = []
    listMock.mockImplementation((_query, init) => {
      if (init?.signal) signals.push(init.signal)
      return new Promise(() => {})
    })

    const { rerender } = renderHook((state: TransactionsState) => useTransactions(state), {
      wrapper,
      initialProps: { ...DEFAULT_STATE, q: 'n' },
    })
    await waitFor(() => expect(signals).toHaveLength(1))

    rerender({ ...DEFAULT_STATE, q: 'net' })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
  })

  it('retries a 500 once, then reports the error', async () => {
    listMock.mockRejectedValue(serverError())
    const { result } = renderHook(() => useTransactions(DEFAULT_STATE), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(listMock).toHaveBeenCalledTimes(2)
    expect(result.current.error).toMatchObject({ status: 500 })
  })

  it('recovers when the single retry succeeds', async () => {
    listMock
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'offline'))
      .mockResolvedValue(page(1, ['a']))
    const { result } = renderHook(() => useTransactions(DEFAULT_STATE), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 400', async () => {
    listMock.mockRejectedValue(new ApiError(400, 'INVALID_DATE', 'bad date'))
    const { result } = renderHook(() => useTransactions(DEFAULT_STATE), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(listMock).toHaveBeenCalledTimes(1)
  })

  it('remembers the last successful response after a later request fails', async () => {
    listMock.mockResolvedValueOnce(page(1, ['a'])).mockRejectedValue(serverError())
    const { result, rerender } = renderHook((state: TransactionsState) => useTransactions(state), {
      wrapper,
      initialProps: DEFAULT_STATE,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ ...DEFAULT_STATE, page: 2 })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.data).toBeUndefined()
    expect(result.current.lastLoaded?.data.map((row) => row.id)).toEqual(['a'])
  })

  it('never fetches a backwards date range', async () => {
    const state = { ...DEFAULT_STATE, from: '2026-09-30', to: '2026-09-01' }
    const { result } = renderHook(() => useTransactions(state), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(listMock).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useTransaction', () => {
  it('does nothing without an id', async () => {
    const { result } = renderHook(() => useTransaction(null), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(detailMock).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('renders a row already in a cached list without fetching it again', () => {
    queryClient.setQueryData(transactionKeys.list({ page: 1, limit: PAGE_SIZE }), page(1, ['a', 'b']))

    const { result } = renderHook(() => useTransaction('b'), { wrapper })

    expect(result.current.data?.id).toBe('b')
    expect(result.current.isSuccess).toBe(true)
    expect(detailMock).not.toHaveBeenCalled()
  })

  it('refetches a cached row once that list copy is stale', async () => {
    queryClient.setQueryData(transactionKeys.list({ page: 1, limit: PAGE_SIZE }), page(1, ['a']), {
      updatedAt: Date.now() - 60_000,
    })
    detailMock.mockResolvedValue({ data: { ...tx('a'), status: 'failed' } })

    const { result } = renderHook(() => useTransaction('a'), { wrapper })

    expect(result.current.data?.status).toBe('successful')
    await waitFor(() => expect(result.current.data?.status).toBe('failed'))
    expect(detailMock).toHaveBeenCalledTimes(1)
  })

  it('fetches a transaction that is not in any cached list, with an AbortSignal', async () => {
    detailMock.mockResolvedValue({ data: tx('zz') })
    const { result } = renderHook(() => useTransaction('zz'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('zz')
    expect(detailMock).toHaveBeenCalledWith('zz', { signal: expect.any(AbortSignal) })
  })

  it('reports a 404 as not found, without retrying', async () => {
    detailMock.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Transaction bogus not found'))
    const { result } = renderHook(() => useTransaction('bogus'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.isNotFound).toBe(true)
    expect(detailMock).toHaveBeenCalledTimes(1)
  })

  it('retries a 500 once and does not report it as not found', async () => {
    detailMock.mockRejectedValue(serverError())
    const { result } = renderHook(() => useTransaction('a'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.isNotFound).toBe(false)
    expect(detailMock).toHaveBeenCalledTimes(2)
  })
})
