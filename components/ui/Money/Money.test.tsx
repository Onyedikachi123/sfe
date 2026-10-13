import { render } from '@testing-library/react'
import { Money } from './Money'

const text = (ui: React.ReactElement) => render(ui).container.textContent

describe('Money', () => {
  it('formats minor units with the currency symbol and two decimals', () => {
    expect(text(<Money amount={150050} currency="NGN" />)).toBe('₦1,500.50')
    expect(text(<Money amount={4599} currency="USD" />)).toBe('$45.99')
    expect(text(<Money amount={85020} currency="GHS" />)).toBe('GH₵850.20')
  })

  it('formats the largest seeded amount exactly', () => {
    expect(text(<Money amount={2_499_999_999_99} currency="NGN" />)).toBe('₦2,499,999,999.99')
  })

  it('keeps trailing zeros on whole amounts', () => {
    expect(text(<Money amount={4500} currency="USD" />)).toBe('$45.00')
  })

  it('prefixes credits with + and debits with - before the symbol', () => {
    expect(text(<Money amount={2500000} currency="NGN" sign="credit" />)).toBe('+₦25,000.00')
    expect(text(<Money amount={4599} currency="USD" sign="debit" />)).toBe('-$45.99')
  })

  it('lets sign decide the direction even if the amount is negative', () => {
    expect(text(<Money amount={-4599} currency="USD" sign="debit" />)).toBe('-$45.99')
    expect(text(<Money amount={-4599} currency="USD" sign="credit" />)).toBe('+$45.99')
  })
})
