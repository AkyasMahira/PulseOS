import { useAuthStore } from '../stores/metrics'
import { Dashboard } from './dashboard/Dashboard'
import { LoginPage } from './dashboard/LoginPage'
import { ErrorBoundary } from './shared/ErrorBoundary'

export function App() {
  const { token } = useAuthStore()
  return (
    <ErrorBoundary>
      {token ? <Dashboard /> : <LoginPage />}
    </ErrorBoundary>
  )
}
