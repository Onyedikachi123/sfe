import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from '../Select'
import { Input } from './Input'

describe('Input', () => {
  it('focuses the input when its label is clicked', async () => {
    render(<Input label="Search" />)

    await userEvent.click(screen.getByText('Search'))

    expect(screen.getByLabelText('Search')).toHaveFocus()
  })

  it('keeps a caller-supplied id', () => {
    render(<Input label="Amount" id="amount" />)
    expect(screen.getByLabelText('Amount')).toHaveAttribute('id', 'amount')
  })

  it('links the hint, or the error in its place, with aria-describedby', () => {
    const { rerender } = render(<Input label="Amount" hint="Minimum 1.00" />)
    expect(screen.getByLabelText('Amount')).toHaveAccessibleDescription('Minimum 1.00')

    rerender(<Input label="Amount" hint="Minimum 1.00" error="Too small" />)
    expect(screen.getByLabelText('Amount')).toHaveAccessibleDescription('Too small')
  })

  it('has no description when there is no hint or error', () => {
    render(<Input label="Search" />)
    expect(screen.getByLabelText('Search')).not.toHaveAttribute('aria-describedby')
  })
})

describe('Select', () => {
  it('is labelled by its Field label', () => {
    render(<Select label="Currency" options={[{ value: 'NGN', label: 'NGN' }]} />)
    expect(screen.getByRole('combobox', { name: 'Currency' })).toBeInTheDocument()
  })
})
