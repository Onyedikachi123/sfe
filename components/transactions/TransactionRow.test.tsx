import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('renders a GHS transfer out as a GH₵ debit, with its fee in GH₵', () => {
    render(
      <TransactionRow
        transaction={{
          ...transaction,
          type: 'transfer_out',
          currency: 'GHS',
          amount: 120000,
          fee: 1200,
          counterparty: 'Kwame Mensah',
          narration: 'Transfer to Kwame Mensah',
        }}
      />
    )

    expect(screen.getByText('-GH₵1,200.00')).toBeInTheDocument()
    expect(screen.getByText(/Fee GH₵12\.00/)).toBeInTheDocument()
    expect(screen.queryByText(/₦/)).toBeNull()
  })

  it('renders a GHS transfer in as a GH₵ credit', () => {
    render(
      <TransactionRow
        transaction={{
          ...transaction,
          type: 'transfer_in',
          currency: 'GHS',
          amount: 150050,
          counterparty: 'Kwame Mensah',
          narration: 'Transfer from Kwame Mensah',
        }}
      />
    )

    expect(screen.getByText('+GH₵1,500.50')).toBeInTheDocument()
    expect(screen.queryByText(/₦|\$/)).toBeNull()
  })

  it('renders a USD amount with $', () => {
    render(
      <TransactionRow transaction={{ ...transaction, type: 'card_payment', currency: 'USD', amount: 1549 }} />
    )

    expect(screen.getByText('-$15.49')).toBeInTheDocument()
    expect(screen.queryByText(/₦|GH₵/)).toBeNull()
  })

  it('shows only the time, and no fee, when grouped under a day heading', () => {
    render(
      <TransactionRow
        variant="grouped"
        transaction={{ ...transaction, type: 'withdrawal', currency: 'USD', fee: 1500 }}
      />
    )

    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument()
    expect(screen.queryByText(/Fee/)).toBeNull()
    expect(screen.queryByText(/2026/)).toBeNull()
  })

  it('shows the status as a labelled badge', () => {
    render(<TransactionRow transaction={{ ...transaction, status: 'pending' }} />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('shows the counterparty initials instead of the type icon for transfers', () => {
    const { container } = render(
      <TransactionRow
        transaction={{
          ...transaction,
          type: 'transfer_in',
          counterparty: 'Ada Okafor',
          narration: 'Transfer from Ada Okafor',
        }}
      />
    )
    expect(screen.getByText('AO')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('calls onSelect with the transaction', async () => {
    const onSelect = vi.fn()
    render(<TransactionRow transaction={transaction} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(transaction)
  })
})
