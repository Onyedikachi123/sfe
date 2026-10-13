import { render, screen } from '@testing-library/react'
import type { Transaction } from '@/types/api'
import { TransactionRow } from './TransactionRow'

const MARKUP = `Bill payment - Spectranet <img src=x onerror="window.__narrationXss = true">`

const transaction: Transaction = {
  id: 'txn_test',
  reference: 'ACM-12345678',
  type: 'bill_payment',
  status: 'successful',
  currency: 'NGN',
  amount: 150050,
  fee: 0,
  narration: MARKUP,
  counterparty: null,
  createdAt: '2026-09-30T14:22:00.000Z',
}

describe('TransactionRow', () => {
  it('renders narration markup as literal text, never as HTML', () => {
    const { container } = render(<TransactionRow transaction={transaction} />)

    expect(screen.getByText(MARKUP)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows the fee in the transaction currency, formatted from minor units', () => {
    render(
      <TransactionRow
        transaction={{ ...transaction, type: 'withdrawal', currency: 'USD', amount: 150000, fee: 1500 }}
      />
    )

    expect(screen.getByText(/Fee \$15\.00/)).toBeInTheDocument()
    expect(screen.queryByText(/Fee ₦/)).toBeNull()
  })
})
