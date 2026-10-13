import { act, renderHook } from '@testing-library/react'
import { SEARCH_DEBOUNCE_MS, useSearchDraft } from './useSearchDraft'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(initialUrl = '') {
  const commit = vi.fn()
  const hook = renderHook(({ url }) => useSearchDraft(url, commit), { initialProps: { url: initialUrl } })
  const type = (value: string) => act(() => hook.result.current[1](value))
  const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))
  return { ...hook, commit, type, wait }
}

describe('useSearchDraft', () => {
  it('starts from the URL value', () => {
    const { result } = setup('netflix')
    expect(result.current[0]).toBe('netflix')
  })

  it('commits once, after the user pauses, not on every keystroke', () => {
    const { commit, type, wait } = setup()

    type('n')
    wait(100)
    type('ne')
    wait(100)
    type('net')
    expect(commit).not.toHaveBeenCalled()

    wait(SEARCH_DEBOUNCE_MS)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('net')
  })

  it('commits the normalised term, and nothing when that already matches the URL', () => {
    const { commit, type, wait } = setup('net')

    type('  net ')
    wait(SEARCH_DEBOUNCE_MS)
    expect(commit).not.toHaveBeenCalled()

    type('  netflix ')
    wait(SEARCH_DEBOUNCE_MS)
    expect(commit).toHaveBeenCalledWith('netflix')
  })

  it('keeps what the user typed after a write when that write echoes back from the URL', () => {
    const { result, rerender, type, wait } = setup()

    type('net')
    wait(SEARCH_DEBOUNCE_MS)
    type('netf') // still typing while the navigation for "net" is in flight
    rerender({ url: 'net' }) // the echo arrives

    expect(result.current[0]).toBe('netf')
  })

  it('follows the URL when q changes for another reason, like Back', () => {
    const { result, rerender, type, wait } = setup()

    type('net')
    wait(SEARCH_DEBOUNCE_MS)
    rerender({ url: 'net' }) // echo
    rerender({ url: '' }) // Back

    expect(result.current[0]).toBe('')
  })

  it('follows the URL on Forward to a term it wrote earlier', () => {
    const { result, rerender, type, wait } = setup()

    type('net')
    wait(SEARCH_DEBOUNCE_MS)
    rerender({ url: 'net' }) // echo
    rerender({ url: '' }) // Back
    rerender({ url: 'net' }) // Forward

    expect(result.current[0]).toBe('net')
  })

  it('drops a pending write when the URL changes underneath it', () => {
    const { commit, rerender, type, wait } = setup()

    type('net')
    wait(100)
    rerender({ url: 'other' }) // e.g. a link to /transactions?q=other
    wait(SEARCH_DEBOUNCE_MS)

    expect(commit).not.toHaveBeenCalled()
  })
})
