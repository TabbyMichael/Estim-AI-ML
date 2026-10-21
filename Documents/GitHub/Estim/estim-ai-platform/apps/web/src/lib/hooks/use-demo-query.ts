'use client'

/**
 * `useDemoQuery` — wraps `useQuery` and transparently falls back to realistic
 * fixtures when the API is unreachable or returns a 5xx.
 *
 * 401/403/4xx are *not* demo-eligible: auth and validation problems must be
 * surfaced so the user can act on them.
 *
 * While in demo mode the fixture is written into the query cache once, so
 * optimistic demo mutations (`useDemoMutation`) have something to update and
 * the demo view survives client-side navigation.
 */

import { useEffect } from 'react'
import {
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import { isDemoEligible } from '../api/client'

/** Query keys that have already fallen back to fixtures in this session. */
const demoSeeded = new Set<string>()

function hashKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey)
}

export type DemoQueryOptions<T> = UseQueryOptions<T, Error, T, QueryKey> & {
  /** Fixture returned when the API cannot serve the request. */
  demo: T
}

export type DemoQueryResult<T> = Omit<
  UseQueryResult<T, Error>,
  'data' | 'error' | 'isLoading' | 'isError' | 'isSuccess' | 'isPending' | 'status'
> & {
  data: T | undefined
  error: Error | null
  isDemo: boolean
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  isPending: boolean
  status: 'pending' | 'error' | 'success'
}

export function useDemoQuery<T>({ demo, ...options }: DemoQueryOptions<T>): DemoQueryResult<T> {
  const queryClient = useQueryClient()
  const query = useQuery<T, Error, T, QueryKey>(options)
  const key = hashKey(options.queryKey)
  const eligible = query.isError && isDemoEligible(query.error)

  // Seed the fixture once per key so demo mutations can update the cache.
  useEffect(() => {
    if (!eligible || demoSeeded.has(key)) return
    demoSeeded.add(key)
    queryClient.setQueryData(options.queryKey, demo)
  }, [eligible, key, demo, options.queryKey, queryClient])

  const isDemo = eligible || demoSeeded.has(key)

  return {
    ...query,
    data: isDemo ? query.data ?? demo : query.data,
    error: isDemo ? null : query.error,
    isDemo,
    isLoading: isDemo ? false : query.isLoading,
    isPending: isDemo ? false : query.isPending,
    isError: isDemo ? false : query.isError,
    isSuccess: isDemo ? true : query.isSuccess,
    status: isDemo ? 'success' : query.status,
  }
}
