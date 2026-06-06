import { useState } from 'react'
import { useAuthStore } from '../../stores/metrics'
import { Key, Shield, Copy, Check, Lock } from 'lucide-react'

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
    >
      {copied ? <Check size={12} className="text-accent-green" /> : <Copy size={12} />}
    </button>
  )
}

export function ProfilePage() {
  const { token, username, role } = useAuthStore()
  const [tokenVisible, setTokenVisible] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { setPwError('Both fields are required'); return }
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters'); return }
    setSaving(true)
    setPwError('')
    setPwMsg('')
    try {
      const res = await fetch(`${API_URL}/api/auth/password`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!data.ok) { setPwError(data.error || 'Failed to change password'); return }
      setPwMsg('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
    } catch { setPwError('Network error') }
    finally { setSaving(false) }
  }

  const inp = "bg-surface-3 border border-surface-border rounded px-2 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-accent-blue/50 w-full"

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in max-w-lg">
      {/* API Token */}
      <div className="bg-surface-2 border border-surface-border rounded-lg p-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-3 flex items-center gap-2">
          <Key size={12} /> API Token
        </div>
        <div className="text-[10px] text-slate-500 font-mono mb-2">
          Use this token to connect remote PulseOS instances via the servers page or API clients.
        </div>
        <div className="flex items-center gap-2 bg-surface-3 border border-surface-border rounded px-3 py-2">
          <code className="text-[11px] text-slate-300 font-mono flex-1 truncate">
            {tokenVisible ? token : (token ?? '').slice(0, 24) + '••••••••••••••'}
          </code>
          <CopyButton text={token ?? ''} />
          <button onClick={() => setTokenVisible(!tokenVisible)}
            className="text-slate-600 hover:text-slate-400 transition-colors text-[10px] font-mono">
            {tokenVisible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-surface-2 border border-surface-border rounded-lg p-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-3 flex items-center gap-2">
          <Shield size={12} /> Account
        </div>
        <div className="flex items-center gap-3 py-2 border-b border-surface-border">
          <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono w-24">Username</span>
          <span className="text-xs text-slate-300 font-mono">{username}</span>
        </div>
        <div className="flex items-center gap-3 py-2">
          <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono w-24">Role</span>
          <span className="text-xs text-slate-300 font-mono">{role}</span>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-surface-2 border border-surface-border rounded-lg p-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-3 flex items-center gap-2">
          <Lock size={12} /> Change Password
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1">Current Password</label>
            <input type="password" className={inp} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1">New Password</label>
            <input type="password" className={inp} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
          {pwError && <div className="text-[10px] text-accent-red font-mono">{pwError}</div>}
          {pwMsg && <div className="text-[10px] text-accent-green font-mono">{pwMsg}</div>}
          <button onClick={handleChangePassword} disabled={saving}
            className="bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono px-4 py-1.5 rounded-lg hover:bg-accent-blue/20 transition-all disabled:opacity-50 self-start">
            {saving ? 'Changing...' : 'Update Password'}
          </button>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-700 font-mono pb-2">
        PulseOS v0.1.0 · self-hosted
      </p>
    </div>
  )
}
