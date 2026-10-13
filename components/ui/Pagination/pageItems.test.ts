import { getPageItems } from './pageItems'

describe('getPageItems', () => {
  it.each([
    [1, 12, [1, 2, 3, 'gap', 12]],
    [2, 12, [1, 2, 3, 'gap', 12]],
    [3, 12, [1, 2, 3, 4, 'gap', 12]],
    [4, 12, [1, 2, 3, 4, 5, 'gap', 12]],
    [6, 12, [1, 'gap', 5, 6, 7, 'gap', 12]],
    [9, 12, [1, 'gap', 8, 9, 10, 11, 12]],
    [11, 12, [1, 'gap', 10, 11, 12]],
    [12, 12, [1, 'gap', 10, 11, 12]],
  ])('page %i of %i -> %j', (page, total, expected) => {
    expect(getPageItems(page, total)).toEqual(expected)
  })

  it('lists every page when there are few', () => {
    expect(getPageItems(1, 1)).toEqual([1])
    expect(getPageItems(1, 2)).toEqual([1, 2])
    expect(getPageItems(2, 3)).toEqual([1, 2, 3])
    expect(getPageItems(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('never hides a single page behind a gap', () => {
    for (let total = 1; total <= 30; total++) {
      for (let page = 1; page <= total; page++) {
        const items = getPageItems(page, total)
        items.forEach((item, i) => {
          if (item !== 'gap') return
          const before = items[i - 1] as number
          const after = items[i + 1] as number
          expect(after - before).toBeGreaterThan(2)
        })
      }
    }
  })

  it('always includes the first, last and current page, in order', () => {
    for (let total = 1; total <= 30; total++) {
      for (let page = 1; page <= total; page++) {
        const numbers = getPageItems(page, total).filter((item): item is number => item !== 'gap')
        expect(numbers).toContain(1)
        expect(numbers).toContain(total)
        expect(numbers).toContain(page)
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
      }
    }
  })

  it('clamps an out-of-range page', () => {
    expect(getPageItems(99, 12)).toEqual(getPageItems(12, 12))
    expect(getPageItems(0, 12)).toEqual(getPageItems(1, 12))
  })
})
