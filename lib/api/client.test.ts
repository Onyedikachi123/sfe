import { api, ApiError } from './client'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (err) {
    return err
  }
  throw new Error('Expected the request to reject')
}

describe('api client', () => {
  it('returns the body of a 2xx response', async () => {
    const body = { data: [{ id: 'txn_1' }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }
    fetchMock.mockResolvedValue(json(body))

    await expect(api.get('/transactions')).resolves.toEqual(body)
    expect(fetchMock).toHaveBeenCalledWith('/api/transactions', expect.any(Object))
  })

  it('throws an ApiError with the server code and message on a 500', async () => {
    fetchMock.mockResolvedValue(
      json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } }, 500)
    )

    const err = await captureError(api.get('/transactions'))

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    })
  })

  it('throws an ApiError with code UNKNOWN when an error response is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }))

    const err = await captureError(api.get('/transactions'))

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 502, code: 'UNKNOWN' })
  })

  it('throws an ApiError when a 2xx response has no usable body', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }))

    await expect(api.get('/me')).rejects.toMatchObject({ status: 200, code: 'UNKNOWN' })
  })

  it('turns a network failure into an ApiError with status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const err = await captureError(api.get('/me'))

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('rethrows an abort unchanged instead of wrapping it', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    fetchMock.mockRejectedValue(abort)

    const err = await captureError(api.get('/transactions', { signal: AbortSignal.abort() }))

    expect(err).toBe(abort)
    expect(err).not.toBeInstanceOf(ApiError)
  })

  it('sends a JSON body on post', async () => {
    fetchMock.mockResolvedValue(json({ data: { id: 'txn_cnv1' } }))

    await api.post('/convert', { from: 'USD', to: 'NGN', amount: 1999 })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/convert',
      expect.objectContaining({ method: 'POST', body: '{"from":"USD","to":"NGN","amount":1999}' })
    )
  })
})
