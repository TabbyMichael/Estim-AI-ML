import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardPage from '../app/(dashboard)/page'
import { DEMO_ACTIVITY_LIST } from '@/lib/demo/dashboard'

const mockAuditQuery = {
  data: DEMO_ACTIVITY_LIST,
  isLoading: false,
  isError: false,
  isDemo: true,
  refetch: jest.fn(),
}

jest.mock('@/lib/hooks/use-demo-query', () => ({
  useDemoQuery: () => mockAuditQuery,
}))

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-demo',
      email: 'demo@estim.ai',
      full_name: 'Demo Operator',
      is_active: true,
      roles: ['admin'],
      created_at: '2026-01-01T00:00:00Z',
      last_login_at: '2026-01-01T00:00:00Z',
    },
    isDemoSession: true,
  }),
}))

jest.mock('@/lib/realtime-context', () => ({
  useRealtime: () => ({ state: 'disconnected' }),
}))

// Recharts needs measured layout, which jsdom does not provide.
jest.mock('@/components/charts/overview', () => ({
  Sparkline: () => <div data-testid="sparkline" />,
  SpendForecastChart: () => <div data-testid="spend-chart" />,
  ChartLegend: () => <div data-testid="chart-legend" />,
  HealthRing: ({ value }: { value: React.ReactNode }) => <div>{value}</div>,
  chartColor: () => 'currentColor',
}))

describe('Dashboard page', () => {
  it('greets the signed-in operator', () => {
    render(<DashboardPage />)
    expect(screen.getByRole('heading', { level: 1, name: /Demo/ })).toBeInTheDocument()
  })

  it('renders the four portfolio KPIs', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Active projects')).toBeInTheDocument()
    expect(screen.getAllByText('On track').length).toBeGreaterThan(0)
    expect(screen.getAllByText('At risk').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Open alerts').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('sparkline')).toHaveLength(4)
  })

  it('renders the spend chart and project health ring', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Spend vs forecast')).toBeInTheDocument()
    expect(screen.getByTestId('spend-chart')).toBeInTheDocument()
    expect(screen.getByText('Project health')).toBeInTheDocument()
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0)
  })

  it('lists severity-grouped alerts', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Meridian Hospital Wing is 11 days behind')).toBeInTheDocument()
    expect(screen.getByText('Gypsum stock cover below 10 days')).toBeInTheDocument()
    expect(screen.getByText('Weekly executive summary generated')).toBeInTheDocument()
  })

  it('renders recent audit activity', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
    expect(screen.getAllByText('Alex Morgan').length).toBeGreaterThan(0)
  })

  it('renders all seven AI modules', () => {
    render(<DashboardPage />)
    for (const title of [
      'Procurement AI',
      'Cost Forecasting',
      'Inventory AI',
      'Predictive Maintenance',
      'Project Risk',
      'Visual Inspection',
      'Document AI',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
  })

  it('shows demo mode in the system status strip', () => {
    render(<DashboardPage />)
    expect(screen.getByText('Estim API')).toBeInTheDocument()
    expect(screen.getByText('Demo fallback')).toBeInTheDocument()
    expect(screen.getByText('Simulated')).toBeInTheDocument()
  })
})
