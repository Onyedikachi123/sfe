import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Transaction } from '@/types/api'
import { TransactionDetails } from './TransactionDetails'

const transferOut: Transaction = {
  id: 'txn_km',
  reference: 'ACM-48213377',
  type: 'transfer_out',
  status: 'successful',
  currency: 'GHS',
  amount: 120000,
  fee: 1200,
  narration: 'Transfer to Kwame Mensah',
  counterparty: 'Kwame Mensah',
  createdAt: '2026-10-05T10:15:00.000Z',
}

/** The <dd> next to a <dt>, so assertions read like the design's label/value pairs. */
const valueOf = (label: string) =>
  screen.getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement

describe('TransactionDetails', () => {
  it('shows the headline, signed amount and status like the design', () => {
    render(<TransactionDetails transaction={transferOut} />)

    expect(screen.getByText('Transfer out to Kwame Mensah')).toBeInTheDocument()
    expect(screen.getByText('-GH₵1,200.00')).toBeInTheDocument()
    expect(screen.getByText('Successful')).toBeInTheDocument()
    expect(screen.getByText('KM')).toBeInTheDocument()
  })

  it('lists every detail field', () => {
    render(<TransactionDetails transaction={transferOut} />)

    expect(valueOf('Reference')).toHaveTextContent('ACM-48213377')
    expect(valueOf('Date')).toHaveTextContent(/5 Oct 2026, \d{2}:\d{2}/)
    expect(valueOf('Type')).toHaveTextContent('Transfer out')
    expect(valueOf('Counterparty')).toHaveTextContent('Kwame Mensah')
    expect(valueOf('Narration')).toHaveTextContent('Transfer to Kwame Mensah')
  })

  it('summarises a debit as amount + fee, in the transaction currency', () => {
    render(<TransactionDetails transaction={transferOut} />)

    expect(valueOf('Amount')).toHaveTextContent('GH₵1,200.00')
    expect(valueOf('Fee')).toHaveTextContent('GH₵12.00')
    expect(valueOf('Total')).toHaveTextContent('GH₵1,212.00')
  })

  it('shows a credit as +, in green, with no total', () => {
    render(
      <TransactionDetails
        transaction={{
          ...transferOut,
          type: 'conversion',
          counterparty: null,
          narration: 'Converted USD to GHS',
          fee: 1800,
        }}
      />
    )

    expect(screen.getByText('+GH₵1,200.00')).toBeInTheDocument()
    expect(screen.getByText('Converted USD to GHS', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByText('Total')).toBeNull()
    expect(screen.queryByText('Counterparty')).toBeNull()
  })

  it('shows the full narration as text, never as HTML', () => {
    const narration = `Bill payment - Spectranet <img src=x onerror="alert(1)"> ${'VERY LONG '.repeat(20)}`
    const { container } = render(
      <TransactionDetails
        transaction={{ ...transferOut, type: 'bill_payment', counterparty: null, narration }}
      />
    )

    expect(valueOf('Narration').textContent).toBe(narration)
    expect(container.querySelector('img')).toBeNull()
  })

  it('copies the reference and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<TransactionDetails transaction={transferOut} />)

    await userEvent.click(screen.getByRole('button', { name: 'Copy reference' }))

    expect(writeText).toHaveBeenCalledWith('ACM-48213377')
    expect(await within(valueOf('Reference')).findByRole('status')).toHaveTextContent('Copied')
  })

  it('says so when copying is not possible', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    render(<TransactionDetails transaction={transferOut} />)

    await userEvent.click(screen.getByRole('button', { name: 'Copy reference' }))

    expect(await within(valueOf('Reference')).findByRole('status')).toHaveTextContent("Couldn't copy")
  })
})
