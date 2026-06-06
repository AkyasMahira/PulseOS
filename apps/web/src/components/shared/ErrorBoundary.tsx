import { Component, type ReactNode } from 'react'
import { ErrorState } from './ErrorState'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
          <ErrorState
            type="crash"
            title="Something went wrong"
            message={this.state.error.message}
            onRetry={() => { this.setState({ error: null }); window.location.reload() }}
          />
        </div>
      )
    }

    return this.props.children
  }
}
