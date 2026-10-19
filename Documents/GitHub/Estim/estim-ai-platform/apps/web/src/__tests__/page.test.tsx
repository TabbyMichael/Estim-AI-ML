import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../app/page'

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Home />)
    const heading = screen.getByText('Estim AI Platform')
    expect(heading).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<Home />)
    const description = screen.getByText('Construction Intelligence System')
    expect(description).toBeInTheDocument()
  })

  it('renders the four AI modules', () => {
    render(<Home />)
    expect(screen.getByText('Procurement AI')).toBeInTheDocument()
    expect(screen.getByText('Cost Forecasting')).toBeInTheDocument()
    expect(screen.getByText('Inventory AI')).toBeInTheDocument()
    expect(screen.getByText('Predictive Maintenance')).toBeInTheDocument()
  })
})
