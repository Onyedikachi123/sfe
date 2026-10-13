import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Paginated, Transaction } from '@/types/api'
import { ApiError } from '@/lib/api/client'
import { getTransactions } from '@/lib/api/endpoints'
import { TransactionsView } from './TransactionsView'

const router = { push: vi.fn(), replace: vi.fn() }
let search = ''

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/transactions',
  useSearchParams: () => new URLSearchParams(search),
}))
vi.mock('@/lib/api/endpoints', () => ({ getTransactions: vi.fn(), getTransaction: vi.fn() }))

const listMock = vi.mocked(getTransactions)

const tx = (id: string, overrides: Partial<Transaction> = {}): Transaction => ({
  id,
  reference: `ACM-${id}`,
  type: 'card_payment',
  status: 'successful',
  currency: 'USD',
  amount: 1549,
  fee: 0,
  narration: 'Card payment - Netflix',
  counterparty: null,
  createdAt: new Date().toISOString(),
  ...overrides,
})

const response = (rows: Transaction[], total = rows.length): Paginated<Transaction> => ({
  data: rows,
  meta: { page: 1, limit: 20, total, totalPages: Math.max(1, Math.ceil(total / 20)) },
})

function renderAt(query: string) {
  search = query
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  const ui = () => (
    <QueryClientProvider client={client}>
      <TransactionsView />
    </QueryClientProvider>
  )
  const result = render(ui())
  return { ...result, navigateTo: (next: string) => ((search = next), result.rerender(ui())) }
}

beforeEach(() => {
  router.push.mockReset()
  router.replace.mockReset()
  listMock.mockReset()
})

describe('TransactionsView', () => {
  it('shows the total and the rows grouped by day', async () => {
    listMock.mockResolvedValue(response([tx('a'), tx('b', { narration: 'Card payment - Spotify' })], 237))
    renderAt('')

    expect(await screen.findByText('237 transactions')).toBeInTheDocument()
    const today = screen.getByRole('region', { name: 'Today' })
    expect(within(today).getByText('Card payment - Netflix')).toBeInTheDocument()
    expect(within(today).getByText('Card payment - Spotify')).toBeInTheDocument()
  })

  it('counts "results" instead of "transactions" once filtered', async () => {
    listMock.mockResolvedValue(response([tx('a')]))
    renderAt('status=successful')
    expect(await screen.findByText('1 result')).toBeInTheDocument()
  })

  it('pushes a filter change to the URL and resets to page 1', async () => {
    listMock.mockResolvedValue(response([tx('a')]))
    renderAt('page=3&txn=txn_a')
    await screen.findByText('1 transaction')

    await userEvent.selectOptions(screen.getByLabelText('Type'), 'Deposit')

    expect(router.push).toHaveBeenCalledWith('/transactions?type=deposit', { scroll: false })
  })

  it('keeps the mock __scenario in the URL when filtering', async () => {
    listMock.mockResolvedValue(response([tx('a')]))
    renderAt('__scenario=slow')
    await screen.findByText('1 transaction')

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'Failed')

    expect(router.push).toHaveBeenCalledWith('/transactions?status=failed&__scenario=slow', { scroll: false })
  })

  it('does not offer "Reversed", which the API cannot filter by', async () => {
    listMock.mockResolvedValue(response([tx('a')]))
    renderAt('')
    await screen.findByText('1 transaction')

    const options = within(screen.getByLabelText('Status')).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'All statuses',
      'Successful',
      'Pending',
      'Failed',
    ])
  })

  it('replaces (not pushes) the URL once the user stops typing', async () => {
    listMock.mockResolvedValue(response([tx('a')]))
    renderAt('')
    await screen.findByText('1 transaction')

    await userEvent.type(screen.getByLabelText('Search'), 'netflix')

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/transactions?q=netflix', { scroll: false })
    )
    expect(router.replace).toHaveBeenCalledTimes(1)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('shows "Clear filters" only when something is filtered, and clears search and filters', async () => {
    listMock.mockResolvedValue(response([tx('a')]))
    const { navigateTo } = renderAt('')
    await screen.findByText('1 transaction')
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()

    navigateTo('q=net&type=card_payment')
    await userEvent.click(await screen.findByRole('button', { name: 'Clear filters' }))

    expect(router.push).toHaveBeenCalledWith('/transactions', { scroll: false })
    expect(screen.getByLabelText('Search')).toHaveValue('')
  })

  it('shows the filtered empty state with a way out', async () => {
    listMock.mockResolvedValue(response([]))
    renderAt('q=zzz')

    expect(await screen.findByText('No transactions match your filters')).toBeInTheDocument()
    expect(screen.getByText('Try a different search term or remove some filters.')).toBeInTheDocument()
    expect(screen.getByText('0 results')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Clear filters' })).toHaveLength(2)
  })

  it('shows the empty state when there are no transactions at all', async () => {
    listMock.mockResolvedValue(response([]))
    renderAt('')

    expect(await screen.findByText('No transactions yet')).toBeInTheDocument()
    expect(
      screen.getByText('When you add money, send a transfer or pay with your card, it will show up here.')
    ).toBeInTheDocument()
  })

  it('shows the error state after the retry also fails, and tries again on request', async () => {
    listMock.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.'))
    renderAt('')

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load your transactions")
    expect(listMock).toHaveBeenCalledTimes(2)

    listMock.mockResolvedValue(response([tx('a')]))
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Card payment - Netflix')).toBeInTheDocument()
  })

  it('explains a backwards date range instead of fetching', async () => {
    renderAt('from=2026-09-30&to=2026-09-01')

    expect(await screen.findByText("This date range isn't valid")).toBeInTheDocument()
    expect(listMock).not.toHaveBeenCalled()
  })

  it('rewrites an invalid URL to its canonical form without a history entry', async () => {
    listMock.mockResolvedValue(response([tx('a')]))
    renderAt('type=refund&page=abc&utm_source=email&status=failed')

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/transactions?status=failed', { scroll: false })
    )
    expect(router.push).not.toHaveBeenCalled()
  })
})

const pageOf = (page: number, count: number, total = 237): Paginated<Transaction> => ({
  data: Array.from({ length: count }, (_, i) => tx(`p${page}_${i}`, { narration: `Row ${page}.${i}` })),
  meta: { page, limit: 20, total, totalPages: Math.max(1, Math.ceil(total / 20)) },
})

describe('TransactionsView pagination', () => {
  it('shows the range and the pager', async () => {
    listMock.mockResolvedValue(pageOf(1, 20))
    renderAt('')

    expect(await screen.findByText('Showing 1–20 of 237')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows the partial range on the last page and disables Next', async () => {
    listMock.mockResolvedValue(pageOf(12, 17))
    renderAt('page=12')

    expect(await screen.findByText('Showing 221–237 of 237')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('pushes the next page, keeping filters and closing the drawer', async () => {
    listMock.mockResolvedValue(pageOf(1, 20))
    renderAt('status=failed&txn=txn_a')
    await screen.findByText('Showing 1–20 of 237')

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(router.push).toHaveBeenCalledWith('/transactions?status=failed&page=2', { scroll: false })
  })

  it('keeps the previous page on screen, marked as loading, while the next one loads', async () => {
    let resolvePage2: (value: Paginated<Transaction>) => void = () => {}
    listMock
      .mockResolvedValueOnce(pageOf(1, 20))
      .mockReturnValueOnce(new Promise((resolve) => (resolvePage2 = resolve)))
    const { navigateTo } = renderAt('')
    await screen.findByText('Row 1.0')

    navigateTo('page=2')

    expect(screen.getByText('Row 1.0')).toBeInTheDocument()
    expect(screen.getByText('Loading transactions')).toBeInTheDocument()
    // The old rows themselves are marked busy: no full skeleton replaced them.
    expect(screen.getByText('Row 1.0').closest('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')

    resolvePage2(pageOf(2, 20))
    expect(await screen.findByText('Row 2.0')).toBeInTheDocument()
    expect(screen.queryByText('Row 1.0')).toBeNull()
  })

  it('replaces an out-of-range page with the last page, without flashing "no results"', async () => {
    listMock.mockResolvedValue({ data: [], meta: { page: 99, limit: 20, total: 237, totalPages: 12 } })
    renderAt('page=99&status=successful')

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/transactions?status=successful&page=12', {
        scroll: false,
      })
    )
    expect(router.push).not.toHaveBeenCalled()
    expect(screen.queryByText('No transactions match your filters')).toBeNull()
    expect(screen.getByText('Loading transactions')).toBeInTheDocument()
  })

  it('scrolls back to the top of the list when it has scrolled out of view', async () => {
    listMock.mockResolvedValue(pageOf(1, 20))
    const { container } = renderAt('')
    await screen.findByText('Showing 1–20 of 237')

    const results = container.querySelector('[class*="results"]') as HTMLElement
    results.scrollIntoView = vi.fn()
    vi.spyOn(results, 'getBoundingClientRect').mockReturnValue({ top: -400 } as DOMRect)
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })

    await userEvent.click(screen.getByRole('button', { name: 'Page 2' }))

    expect(results.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
  })

  it('does not scroll when the top of the list is already visible', async () => {
    listMock.mockResolvedValue(pageOf(1, 20))
    const { container } = renderAt('')
    await screen.findByText('Showing 1–20 of 237')

    const results = container.querySelector('[class*="results"]') as HTMLElement
    results.scrollIntoView = vi.fn()
    vi.spyOn(results, 'getBoundingClientRect').mockReturnValue({ top: 300 } as DOMRect)

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(results.scrollIntoView).not.toHaveBeenCalled()
  })

  it('hides the pager when everything fits on one page', async () => {
    listMock.mockResolvedValue(pageOf(1, 4, 4))
    renderAt('')

    expect(await screen.findByText('Showing 1–4 of 4')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull()
  })
})
