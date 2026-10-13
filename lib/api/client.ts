import type { ApiErrorBody, ApiSuccess } from '@/types/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api'

const GENERIC_MESSAGE = 'Something went wrong. Please try again.'
const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.'

export class ApiError extends Error {
  constructor(
    /** HTTP status, or 0 when the request never got a response. */
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const isAbortError = (err: unknown) =>
  typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError'

function isErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false
  const { error } = body as { error: unknown }
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  )
}

const isSuccessBody = (body: unknown): body is ApiSuccess<unknown> =>
  typeof body === 'object' && body !== null && 'data' in body

function parseJson(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    // Proxies and gateways answer with HTML or plain text; treat it as "no usable body".
    return null
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiSuccess<T>> {
  let res: Response
  let text: string
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
    text = await res.text()
  } catch (err) {
    // A cancelled request is the caller's decision, not a failure, so it keeps its identity.
    if (isAbortError(err)) throw err
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE)
  }

  const body = parseJson(text)

  if (!res.ok) {
    if (isErrorBody(body)) throw new ApiError(res.status, body.error.code, body.error.message)
    throw new ApiError(res.status, 'UNKNOWN', GENERIC_MESSAGE)
  }
  if (!isSuccessBody(body)) throw new ApiError(res.status, 'UNKNOWN', GENERIC_MESSAGE)

  return body as ApiSuccess<T>
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, init),
  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'POST', body: JSON.stringify(body) }),
}
