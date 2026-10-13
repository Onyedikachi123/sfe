import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type TransactionStatus,
  type TransactionType,
} from '@/types/api'
import {
  DEFAULT_STATE,
  hasInvalidDateRange,
  isIsoDate,
  MAX_QUERY_LENGTH,
  PAGE_SIZE,
  parseTransactionsSearchParams,
  toApiQuery,
  toSearchParams,
  type TransactionsState,
} from './query-state'

const parse = (query: string) => parseTransactionsSearchParams(new URLSearchParams(query))

const FULL_STATE: TransactionsState = {
  q: 'netflix',
  type: 'card_payment',
  status: 'successful',
  currency: 'USD',
  from: '2026-09-01',
  to: '2026-09-30',
  page: 3,
  txn: 'txn_255s',
  scenario: 'slow',
}

describe('enum lists', () => {
  it('cover every member of their union type', () => {
    expectTypeOf<(typeof TRANSACTION_TYPES)[number]>().toEqualTypeOf<TransactionType>()
    expectTypeOf<(typeof TRANSACTION_STATUSES)[number]>().toEqualTypeOf<TransactionStatus>()
  })
})

describe('parseTransactionsSearchParams', () => {
  it('returns the defaults for an empty query string', () => {
    expect(parse('')).toEqual(DEFAULT_STATE)
  })

  it('reads every valid param', () => {
    expect(
      parse(
        'q=netflix&type=card_payment&status=successful&currency=USD&from=2026-09-01&to=2026-09-30&page=3&txn=txn_255s&__scenario=slow'
      )
    ).toEqual(FULL_STATE)
  })

  it('drops values outside the enums instead of sending them to the API', () => {
    expect(parse('type=refund&status=reversed&currency=EUR')).toMatchObject({
      type: null,
      status: null,
      currency: null,
    })
  })

  it('is case-sensitive about enum values, like the API', () => {
    expect(parse('currency=usd&status=Pending')).toMatchObject({ currency: null, status: null })
  })

  it('does not treat Object prototype keys as enum members', () => {
    expect(parse('type=constructor&status=toString')).toMatchObject({ type: null, status: null })
  })

  it.each(['0', '-1', 'abc', '', '1.5', '2.0', '1e1', '0x2', ' 3 ', '01', '99999999999999999999'])(
    'falls back to page 1 for page=%j',
    (page) => {
      expect(parse(`page=${encodeURIComponent(page)}`).page).toBe(1)
    }
  )

  it('accepts any positive integer page', () => {
    expect(parse('page=1').page).toBe(1)
    expect(parse('page=12').page).toBe(12)
    expect(parse('page=999').page).toBe(999)
  })

  it.each([
    '2026-02-30',
    '2026-13-01',
    '2026-00-10',
    '2026-9-1',
    '01-09-2026',
    '2026-09-01T00:00',
    'today',
    '',
  ])('drops the invalid date %j', (date) => {
    expect(parse(`from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`)).toMatchObject({
      from: null,
      to: null,
    })
  })

  it('accepts a leap day only in a leap year', () => {
    expect(parse('from=2028-02-29').from).toBe('2028-02-29')
    expect(parse('from=2026-02-29').from).toBeNull()
  })

  it('keeps a backwards date range so the page can explain it, rather than silently dropping it', () => {
    expect(parse('from=2026-09-30&to=2026-09-01')).toMatchObject({ from: '2026-09-30', to: '2026-09-01' })
  })

  it('trims the search term and treats whitespace-only as no search', () => {
    expect(parse('q=%20%20net%20flix%20').q).toBe('net flix')
    expect(parse('q=%20%20%20').q).toBe('')
  })

  it('caps the search term length', () => {
    expect(parse(`q=${'a'.repeat(MAX_QUERY_LENGTH + 50)}`).q).toHaveLength(MAX_QUERY_LENGTH)
  })

  it('drops a txn id that cannot be a real id', () => {
    expect(parse('txn=../../me').txn).toBeNull()
    expect(parse(`txn=${'a'.repeat(65)}`).txn).toBeNull()
    expect(parse('txn=').txn).toBeNull()
  })

  it('uses the first value when a param is repeated', () => {
    expect(parse('type=deposit&type=withdrawal').type).toBe('deposit')
  })

  it('preserves __scenario so the mock API scenario keeps working', () => {
    expect(parse('__scenario=error').scenario).toBe('error')
    expect(parse('__scenario=').scenario).toBeNull()
  })
})

describe('toSearchParams', () => {
  it('omits every default', () => {
    expect(toSearchParams(DEFAULT_STATE).toString()).toBe('')
    expect(toSearchParams({ ...DEFAULT_STATE, page: 1, q: '' }).toString()).toBe('')
  })

  it('writes keys in a stable order regardless of how the state was built', () => {
    const shuffled: TransactionsState = {
      scenario: 'slow',
      txn: 'txn_255s',
      page: 3,
      to: '2026-09-30',
      from: '2026-09-01',
      currency: 'USD',
      status: 'successful',
      type: 'card_payment',
      q: 'netflix',
    }
    expect([...toSearchParams(shuffled).keys()]).toEqual([
      'q',
      'type',
      'status',
      'currency',
      'from',
      'to',
      'page',
      'txn',
      '__scenario',
    ])
  })

  it('carries __scenario through a filter change', () => {
    const state = parse('__scenario=empty&status=failed')
    const next = toSearchParams({ ...state, status: 'pending', page: 1 })
    expect(next.get('__scenario')).toBe('empty')
    expect(next.toString()).toBe('status=pending&__scenario=empty')
  })

  it('drops unknown params other than __scenario', () => {
    expect(toSearchParams(parse('utm_source=email&foo=bar&status=failed')).toString()).toBe('status=failed')
  })
})

describe('round trip', () => {
  it('parse(toSearchParams(state)) returns the same state', () => {
    expect(parseTransactionsSearchParams(toSearchParams(FULL_STATE))).toEqual(FULL_STATE)
    expect(parseTransactionsSearchParams(toSearchParams(DEFAULT_STATE))).toEqual(DEFAULT_STATE)
  })

  it('normalises a messy URL into a canonical one, which then stays stable', () => {
    const messy = '?page=2.0&q=%20net%20&type=nope&currency=NGN&from=2026-02-30&txn=txn_1&zzz=1'
    const canonical = toSearchParams(parse(messy)).toString()

    expect(canonical).toBe('q=net&currency=NGN&txn=txn_1')
    expect(toSearchParams(parse(canonical)).toString()).toBe(canonical)
  })

  it('encodes special characters in the search term safely', () => {
    const state = { ...DEFAULT_STATE, q: 'a&b=c #1 ₦' }
    expect(parseTransactionsSearchParams(toSearchParams(state)).q).toBe('a&b=c #1 ₦')
  })
})

describe('hasInvalidDateRange', () => {
  it('is true only when both dates are set and from is after to', () => {
    expect(hasInvalidDateRange({ from: '2026-09-30', to: '2026-09-01' })).toBe(true)
    expect(hasInvalidDateRange({ from: '2026-09-01', to: '2026-09-30' })).toBe(false)
    expect(hasInvalidDateRange({ from: '2026-09-01', to: '2026-09-01' })).toBe(false)
    expect(hasInvalidDateRange({ from: '2026-09-30', to: null })).toBe(false)
    expect(hasInvalidDateRange({ from: null, to: '2026-09-01' })).toBe(false)
  })
})

describe('isIsoDate', () => {
  it('rejects dates Date.parse would roll over', () => {
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-02-28')).toBe(true)
  })
})

describe('toApiQuery', () => {
  it('maps state to the list request with a fixed page size', () => {
    expect(toApiQuery(FULL_STATE)).toEqual({
      page: 3,
      limit: PAGE_SIZE,
      q: 'netflix',
      type: 'card_payment',
      status: 'successful',
      currency: 'USD',
      from: '2026-09-01',
      to: '2026-09-30',
    })
  })

  it('sends only page and limit for the default state', () => {
    const query = toApiQuery(DEFAULT_STATE)
    expect(query).toEqual({
      page: 1,
      limit: 20,
      q: undefined,
      type: undefined,
      status: undefined,
      currency: undefined,
      from: undefined,
      to: undefined,
    })
  })

  it('never includes the drawer selection or the mock scenario', () => {
    expect(toApiQuery(FULL_STATE)).not.toHaveProperty('txn')
    expect(toApiQuery(FULL_STATE)).not.toHaveProperty('scenario')
  })
})
