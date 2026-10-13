import type { TransactionStatus } from '@/types/api'
import { Badge, type BadgeTone } from '@/components/ui'
import { TRANSACTION_STATUS_LABELS } from '@/lib/format'

const STATUS_TONES: Record<TransactionStatus, BadgeTone> = {
  successful: 'success',
  pending: 'warning',
  failed: 'danger',
}

/** Status pill with a leading dot; the label carries the meaning, the colour only reinforces it. */
export function StatusBadge({ status, className }: { status: TransactionStatus; className?: string }) {
  return (
    <Badge tone={STATUS_TONES[status]} dot className={className}>
      {TRANSACTION_STATUS_LABELS[status]}
    </Badge>
  )
}
