'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { retryOnceOnServerError } from '@/lib/api/retry'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Back/Forward within this window reuses cached pages instead of refetching. Conversions add
        // rows, so the window is kept short rather than "until reload".
        staleTime: 30_000,
        retry: retryOnceOnServerError,
        // A read-only history doesn't need to refetch every time the tab regains focus, and with ~3%
        // random failures that would surface errors the user didn't ask for.
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session; on the server each render gets its own, so no request can
  // read another's cache.
  const [queryClient] = useState(makeQueryClient)
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
