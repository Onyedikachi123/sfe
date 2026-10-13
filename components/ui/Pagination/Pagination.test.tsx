import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'

function renderPager(page: number, totalPages = 12) {
  const onPageChange = vi.fn()
  render(<Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />)
  return onPageChange
}

describe('Pagination', () => {
  it('is a labelled navigation landmark', () => {
    renderPager(1)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
  })

  it('disables Previous on the first page only', () => {
    renderPager(1)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
  })

  it('disables Next on the last page only', () => {
    renderPager(12)
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  })

  it('marks the current page with aria-current', () => {
    renderPager(2)
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Page 1' })).not.toHaveAttribute('aria-current')
  })

  it('shows the designed page numbers with a gap', () => {
    renderPager(1)
    const pages = screen.getAllByRole('button', { name: /^Page \d+$/ }).map((b) => b.textContent)
    expect(pages).toEqual(['1', '2', '3', '12'])
    expect(screen.getByText('…')).toBeInTheDocument()
  })

  it('reports the page chosen by Previous, Next and the numbers', async () => {
    const onPageChange = renderPager(5)

    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await userEvent.click(screen.getByRole('button', { name: 'Page 12' }))

    expect(onPageChange.mock.calls).toEqual([[4], [6], [12]])
  })

  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
