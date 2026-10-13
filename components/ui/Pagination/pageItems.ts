export type PageItem = number | 'gap'

/**
 * Page numbers to show around the current page: always the first and last, the current page and
 * its neighbours, and a gap ("…") where pages are skipped. A gap never hides a single page — that
 * page is shown instead, since the ellipsis would take the same space.
 *
 *   page 1 of 12  -> 1 2 3 … 12
 *   page 6 of 12  -> 1 … 5 6 7 … 12
 *   page 12 of 12 -> 1 … 10 11 12
 */
export function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 1) return [1]

  const current = Math.min(Math.max(page, 1), totalPages)
  // At either end, widen the window so the row keeps the same length (1 2 3 … 12, not 1 2 … 12).
  const start = Math.max(1, Math.min(current - 1, totalPages - 2))
  const end = Math.min(totalPages, Math.max(current + 1, 3))

  const pages = new Set([1, totalPages])
  for (let n = start; n <= end; n++) pages.add(n)

  const items: PageItem[] = []
  let previous = 0
  for (const n of [...pages].sort((a, b) => a - b)) {
    if (n - previous === 2) items.push(previous + 1)
    else if (n - previous > 2) items.push('gap')
    items.push(n)
    previous = n
  }
  return items
}
