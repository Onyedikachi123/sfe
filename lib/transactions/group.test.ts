import type { Transaction } from '@/types/api'
import { groupByDay } from './group'

const tx = (id: string, createdAt: Date): Transaction => ({
  id,
  reference: `ACM-${id}`,
  type: 'deposit',
  status: 'successful',
  currency: 'NGN',
  amount: 100,
  fee: 0,
  narration: 'Wallet top-up via bank transfer',
  counterparty: null,
  createdAt: createdAt.toISOString(),
})

// Built from local-time parts, so the expectations hold in any time zone the tests run in.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h)
const NOW = local(2026, 10, 13, 15)

describe('groupByDay', () => {
  it('labels today and yesterday, and formats older days', () => {
    const groups = groupByDay(
      [tx('a', local(2026, 10, 13, 9)), tx('b', local(2026, 10, 12, 21)), tx('c', local(2026, 10, 5, 10))],
      NOW
    )

    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Mon, 5 Oct 2026'])
  })

  it('keeps rows in order within each day', () => {
    const groups = groupByDay(
      [
        tx('a', local(2026, 10, 13, 14)),
        tx('b', local(2026, 10, 13, 9)),
        tx('c', local(2026, 10, 12, 23)),
        tx('d', local(2026, 10, 12, 1)),
      ],
      NOW
    )

    expect(groups.map((g) => g.transactions.map((t) => t.id))).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('splits days at local midnight, not UTC midnight', () => {
    const groups = groupByDay([tx('late', local(2026, 10, 12, 23)), tx('early', local(2026, 10, 12, 0))], NOW)
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('2026-10-12')
  })

  it('treats "yesterday" correctly across a month boundary', () => {
    const groups = groupByDay([tx('a', local(2026, 9, 30, 10))], local(2026, 10, 1, 8))
    expect(groups[0].label).toBe('Yesterday')
  })

  it('returns no groups for no rows', () => {
    expect(groupByDay([], NOW)).toEqual([])
  })
})
