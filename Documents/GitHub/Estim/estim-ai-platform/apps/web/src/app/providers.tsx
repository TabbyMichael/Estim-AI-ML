'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/lib/theme-provider'
import { AuthProvider } from '@/lib/auth-context'
import { RealtimeProvider } from '@/lib/realtime-context'

export const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <RealtimeProvider>
            {children}
          </RealtimeProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}