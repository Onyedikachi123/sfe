import { ApiError } from './client'

/**
 * TanStack Query `retry` policy: one retry, and only for failures a retry can fix — server errors
 * (5xx) and requests that never got a response (status 0). A 4xx means the request itself is wrong
 * or the resource doesn't exist, so repeating it only delays the error. Cancelled requests are
 * never retried by TanStack Query itself, so they don't reach this function.
 */
export function retryOnceOnServerError(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false
  return error instanceof ApiError && (error.status === 0 || error.status >= 500)
}
