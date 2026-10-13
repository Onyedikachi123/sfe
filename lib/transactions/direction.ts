import type { TransactionType } from '@/types/api'

/**
 * Money in. A conversion's history row is the received side, in the target currency (API.md,
 * POST /api/convert), so it counts as a credit.
 */
const CREDIT_TYPES: ReadonlySet<TransactionType> = new Set(['deposit', 'transfer_in', 'conversion'])

export const isCredit = (type: TransactionType): boolean => CREDIT_TYPES.has(type)
