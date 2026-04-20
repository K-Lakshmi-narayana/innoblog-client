import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="panel empty-panel error-boundary">
          <span className="eyebrow">Something went wrong</span>
          <h1>Unexpected error in the publishing flow.</h1>
          <p>
            Refresh the page or return to the homepage. If the problem persists,
            the app may need a retry.
          </p>
          <a className="button button--primary" href="#/">
            Return home
          </a>
        </section>
      )
    }

    return this.props.children
  }
}
