// TanStack Query client factory. React Query ships as a wagmi peer dependency,
// so we reuse it for API polling/caching (live action feed, covenant reads).

import { QueryClient } from "@tanstack/react-query"

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
}
