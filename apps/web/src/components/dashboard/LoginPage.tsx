import { useState } from 'react'
import { useAuthStore } from '../../stores/metrics'

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setAuth(data.data.token, data.data.username)
      window.location.reload()
    } catch (e: any) {
      setError(e.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center font-mono p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-accent-green shadow-[0_0_6px_#22c55e88]" />
            <span className="text-lg font-bold tracking-widest">PULSE<span className="text-accent-blue">OS</span></span>
          </div>
          <p className="text-slate-600 text-xs">VPS Monitoring Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="bg-surface-2 border border-surface-border rounded-xl p-6 flex flex-col gap-4">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-surface-3 border border-surface-border rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent-blue/50 transition-colors placeholder:text-slate-700"
              placeholder="admin"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-surface-3 border border-surface-border rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent-blue/50 transition-colors placeholder:text-slate-700"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-accent-red text-xs bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded-lg py-2 text-sm font-semibold hover:bg-accent-blue/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-700 mt-4">
          PulseOS v0.1.0 · self-hosted
        </p>
      </div>
    </div>
  )
}
