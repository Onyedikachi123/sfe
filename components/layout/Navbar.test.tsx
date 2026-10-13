import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))
vi.mock('./UserMenu', () => ({ UserMenu: () => null }))

function renderAt(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname)
  render(<Navbar />)
}

const link = (name: string) => screen.getByRole('link', { name })

describe('Navbar', () => {
  it('marks only the current section with aria-current="page"', () => {
    renderAt('/transactions')

    expect(link('Transactions')).toHaveAttribute('aria-current', 'page')
    expect(link('Dashboard')).not.toHaveAttribute('aria-current')
    expect(link('Convert')).not.toHaveAttribute('aria-current')
  })

  it('keeps a section active on nested routes', () => {
    renderAt('/transactions/txn_255s')
    expect(link('Transactions')).toHaveAttribute('aria-current', 'page')
  })

  it('activates Dashboard only on the root path', () => {
    renderAt('/')
    expect(link('Dashboard')).toHaveAttribute('aria-current', 'page')
    expect(link('Transactions')).not.toHaveAttribute('aria-current')
  })

  it('does not treat a path that merely starts with the same letters as active', () => {
    renderAt('/transactionsfoo')
    expect(link('Transactions')).not.toHaveAttribute('aria-current')
  })
})
