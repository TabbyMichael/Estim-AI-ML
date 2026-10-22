'use client'

/**
 * `useDemoMutation` — wraps `useMutation` so writes attempted while the API is
 * offline still produce a believable result:
 *
 * - the `demo` callback applies an optimistic cache update and returns a
 *   synthetic response;
 * - the normal `onSuccess` handler runs with that synthetic response;
 * - a "demo mode" toast explains that nothing was persisted.
 *
 * 4xx/5xx errors are *not* treated as demo successes.
 */

import { useState } from 'react'
import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query'
import { isDemoEligible } from '../api/client'
import { useToast } from './use-toast'

export const DEMO_MUTATION_MESSAGE =
  'The API is unreachable, so this change was not saved.'

export type DemoMutationOptions<TData, TVars> = UseMutationOptions<TData, Error, TVars> & {
  /** Apply an optimistic update and return the synthetic response. */
  demo?: (vars: TVars, queryClient: QueryClient) => TData
  demoMessage?: string
}

export type DemoMutationResult<TData, TVars> = UseMutationResult<TData, Error, TVars> & {
  /** True when the last attempt succeeded via the demo fallback. */
  isDemo: boolean
}

export function useDemoMutation<TData, TVars = void>(
  options: DemoMutationOptions<TData, TVars>,
): DemoMutationResult<TData, TVars> {
  const { demo, demoMessage, ...rest } = options
  const queryClient = useQueryClient()
  const { info } = useToast()
  const [isDemo, setIsDemo] = useState(false)

  const mutation = useMutation<TData, Error, TVars>({
    ...rest,
    onError: (error, vars, onMutateResult) => {
      if (demo && isDemoEligible(error)) {
        setIsDemo(true)
        const result = demo(vars, queryClient)
        info('Demo mode', demoMessage ?? DEMO_MUTATION_MESSAGE)
        rest.onSuccess?.(result, vars, onMutateResult, {
          client: queryClient,
          meta: rest.meta,
        })
        return
      }
      setIsDemo(false)
      rest.onError?.(error, vars, onMutateResult, { client: queryClient, meta: rest.meta })
    },
  })

  return { ...mutation, isDemo }
}
