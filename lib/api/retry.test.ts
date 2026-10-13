import { ApiError } from './client'
import { retryOnceOnServerError } from './retry'

describe('retryOnceOnServerError', () => {
  it.each([500, 502, 503])('retries a %i once', (status) => {
    const error = new ApiError(status, 'INTERNAL_ERROR', 'boom')
    expect(retryOnceOnServerError(0, error)).toBe(true)
    expect(retryOnceOnServerError(1, error)).toBe(false)
  })

  it('retries a network failure (status 0) once', () => {
    const error = new ApiError(0, 'NETWORK_ERROR', 'offline')
    expect(retryOnceOnServerError(0, error)).toBe(true)
    expect(retryOnceOnServerError(1, error)).toBe(false)
  })

  it.each([400, 404, 422, 429])('never retries a %i', (status) => {
    expect(retryOnceOnServerError(0, new ApiError(status, 'X', 'x'))).toBe(false)
  })

  it('never retries an error that is not an ApiError', () => {
    expect(retryOnceOnServerError(0, new Error('bug'))).toBe(false)
  })
})
