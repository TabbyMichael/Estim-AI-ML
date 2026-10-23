import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isDemoEligible } from '@/lib/api/client'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'

jest.mock('@/lib/api/client', () => ({
  isDemoEligible: jest.fn(),
}))

const mockedIsDemoEligible = isDemoEligible as jest.MockedFunction<typeof isDemoEligible>

type Payload = { items: string[] }

const DEMO: Payload = { items: ['fixture'] }

function Wrapper({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function Probe({
  queryKey,
  demo = DEMO,
  fail = true,
}: {
  queryKey: string
  demo?: Payload
  fail?: boolean
}) {
  const query = useDemoQuery<Payload>({
    queryKey: [queryKey],
    queryFn: async () => {
      if (fail) throw new Error('network down')
      return { items: ['live'] }
    },
    demo,
  })

  return (
    <div>
      <span data-testid="mode">{query.isDemo ? 'demo' : query.isError ? 'error' : 'live'}</span>
      <span data-testid="data">{query.data?.items.join(',') ?? 'none'}</span>
    </div>
  )
}

function renderProbe(props: { queryKey: string; fail?: boolean }) {
  return render(
    <Wrapper>
      <Probe {...props} />
    </Wrapper>,
  )
}

describe('useDemoQuery', () => {
  beforeEach(() => {
    mockedIsDemoEligible.mockReset()
  })

  it('falls back to fixtures when the API is unreachable', async () => {
    mockedIsDemoEligible.mockReturnValue(true)
    renderProbe({ queryKey: 'fallback-demo' })

    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('demo'))
    expect(screen.getByTestId('data')).toHaveTextContent('fixture')
  })

  it('surfaces non-demo errors instead of hiding them', async () => {
    mockedIsDemoEligible.mockReturnValue(false)
    renderProbe({ queryKey: 'fallback-error' })

    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('error'))
    expect(screen.getByTestId('data')).toHaveTextContent('none')
  })

  it('returns live data untouched when the API responds', async () => {
    mockedIsDemoEligible.mockReturnValue(true)
    renderProbe({ queryKey: 'live-response', fail: false })

    await waitFor(() => expect(screen.getByTestId('data')).toHaveTextContent('live'))
    expect(screen.getByTestId('mode')).toHaveTextContent('live')
  })
})
