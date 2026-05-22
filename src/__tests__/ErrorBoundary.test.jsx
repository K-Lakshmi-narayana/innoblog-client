import { render, screen } from '@testing-library/react'

import ErrorBoundary from '../components/ErrorBoundary'

function BrokenComponent() {
  throw new Error('Render failed')
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Healthy content</div>
      </ErrorBoundary>,
    )

    expect(screen.getByText('Healthy content')).toBeInTheDocument()
  })

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary title="Editor crashed" description="Try again from the dashboard.">
        <BrokenComponent />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Editor crashed')).toBeInTheDocument()
    expect(screen.getByText('Try again from the dashboard.')).toBeInTheDocument()
  })
})
