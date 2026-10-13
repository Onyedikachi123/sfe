import { cx } from '@/lib/cx'
import { Button } from '../Button'
import { getPageItems } from './pageItems'
import styles from './Pagination.module.css'

export interface PaginationProps {
  /** 1-based. */
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

/**
 * Previous / page numbers / Next. On narrow screens the numbers collapse to "Page x of y" and the
 * labels shorten, per the mobile design; both forms are rendered and CSS picks one, so the
 * accessible names stay the same at every width.
 */
export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Pagination" className={cx(styles.pagination, className)}>
      <Button
        variant="secondary"
        size="sm"
        iconLeft="chevron-left"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <span className={styles.wide}>Previous</span>
        <span className={styles.narrow}>Prev</span>
      </Button>

      <ol className={styles.pages}>
        {getPageItems(page, totalPages).map((item, i) =>
          item === 'gap' ? (
            <li key={`gap-${i}`} className={styles.gap} aria-hidden>
              …
            </li>
          ) : (
            <li key={item}>
              <Button
                variant={item === page ? 'primary' : 'ghost'}
                size="sm"
                className={cx(styles.number, item !== page && styles.idle)}
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </Button>
            </li>
          )
        )}
      </ol>
      <span className={styles.position}>
        Page {page} of {totalPages}
      </span>

      <Button
        variant="secondary"
        size="sm"
        iconRight="chevron-right"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        Next
      </Button>
    </nav>
  )
}
