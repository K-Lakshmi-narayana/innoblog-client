import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null })
    }
  }

  componentDidCatch(error, info) {
    console.error(
      `ErrorBoundary caught an error${this.props.contextLabel ? ` in ${this.props.contextLabel}` : ''}`,
      error,
      info,
    )

    if (typeof this.props.onError === 'function') {
      this.props.onError(error, info)
    }
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const title = this.props.title || 'Something went wrong'
      const description =
        this.props.description ||
        'Refresh the page or head back to a stable screen and try again.'
      const actionHref = this.props.actionHref || '#/'
      const actionLabel = this.props.actionLabel || 'Return home'

      return (
        <section className="panel empty-panel error-boundary">
          <span className="eyebrow">Something went wrong</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {this.state.error?.message ? (
            <p className="form-message form-message--error">{this.state.error.message}</p>
          ) : null}
          <div className="hero__actions">
            <button className="button button--secondary" type="button" onClick={this.handleReset}>
              Try again
            </button>
            <a className="button button--primary" href={actionHref}>
              {actionLabel}
            </a>
          </div>
        </section>
      )
    }

    return this.props.children
  }
}
