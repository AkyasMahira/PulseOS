import { useAuthStore } from '../stores/metrics'
import { Dashboard } from './dashboard/Dashboard'
import { LoginPage } from './dashboard/LoginPage'

export function App() {
  const { token } = useAuthStore()
  return token ? <Dashboard /> : <LoginPage />
}
