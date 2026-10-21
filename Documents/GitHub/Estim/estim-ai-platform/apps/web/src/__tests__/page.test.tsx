import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../app/page'

describe('Home Page', () => {
  it('renders the dashboard greeting', () => {
    render(<Home />)
    const heading = screen.getByRole('heading', { name: /Welcome back/ })
    expect(heading).toBeInTheDocument()
  })

  it('renders the summary description', () => {
    render(<Home />)
    const description = screen.getByText(/what.s happening with your construction projects today/)
    expect(description).toBeInTheDocument()
  })

  it('renders the four AI modules', () => {
    render(<Home />)
    expect(screen.getByText('Procurement AI')).toBeInTheDocument()
    expect(screen.getByText('Cost Forecasting')).toBeInTheDocument()
    expect(screen.getByText('Inventory AI')).toBeInTheDocument()
    expect(screen.getByText('Predictive Maintenance')).toBeInTheDocument()
  })

  it('renders the remaining platform modules', () => {
    render(<Home />)
    expect(screen.getByText('Project Risk')).toBeInTheDocument()
    expect(screen.getByText('Visual Inspection')).toBeInTheDocument()
    expect(screen.getByText('Document AI')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('Audit Log')).toBeInTheDocument()
  })

  it('renders the project summary stats', () => {
    render(<Home />)
    expect(screen.getByText('Active Projects')).toBeInTheDocument()
    expect(screen.getByText('On Track')).toBeInTheDocument()
    expect(screen.getByText('At Risk')).toBeInTheDocument()
  })
})
