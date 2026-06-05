import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/metrics'
import { Users, UserPlus, Trash2, Shield, Mail, Clock, Copy, Check } from 'lucide-react'
import type { TeamUser, Invite, UserRole } from '@pulseos/types'

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'text-purple-400 bg-purple-950/40 border-purple-900/40',
  admin: 'text-blue-400 bg-blue-950/40 border-blue-900/40',
  viewer: 'text-slate-400 bg-slate-800/40 border-slate-700/40',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-slate-600 hover:text-slate-400 transition-colors"
    >
      {copied ? <Check size={12} className="text-accent-green" /> : <Copy size={12} />}
    </button>
  )
}

function InviteForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const { token } = useAuthStore()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('viewer')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')

  const handleSubmit = async () => {
    if (!email) { setError('Email is required'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/team/invites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error || 'Failed to create invite'); return }
      setInviteUrl(data.data.inviteUrl)
      onCreated()
    } catch { setError('Network error') }
    finally { setSending(false) }
  }

  const inp = "bg-surface-3 border border-surface-border rounded px-2 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-accent-blue/50 w-full"

  if (inviteUrl) {
    return (
      <div className="bg-surface-2 border border-accent-green/20 rounded-xl p-4 animate-slide-up">
        <div className="text-[11px] text-accent-green font-mono uppercase tracking-widest mb-2">Invite Created</div>
        <div className="text-xs text-slate-400 font-mono mb-2">Share this URL with the invitee:</div>
        <div className="flex items-center gap-2 bg-surface-3 border border-surface-border rounded px-3 py-2">
          <code className="text-[11px] text-slate-200 font-mono flex-1 truncate">{inviteUrl}</code>
          <CopyButton text={inviteUrl} />
        </div>
        <button onClick={onCancel} className="mt-3 bg-surface-3 border border-surface-border text-slate-400 text-xs font-mono px-4 py-1.5 rounded-lg hover:text-slate-200 transition-all">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="bg-surface-2 border border-accent-blue/20 rounded-xl p-4 animate-slide-up">
      <div className="text-[11px] text-slate-300 font-mono uppercase tracking-widest mb-3">Invite Team Member</div>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1">Email</label>
          <input className={inp} type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1">Role</label>
          <select className={inp} value={role} onChange={e => setRole(e.target.value as UserRole)}>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && <div className="text-[10px] text-red-400 font-mono">{error}</div>}
        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={sending}
            className="bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono px-4 py-1.5 rounded-lg hover:bg-accent-blue/20 transition-all disabled:opacity-50">
            {sending ? 'Creating...' : 'Generate Invite Link'}
          </button>
          <button onClick={onCancel} className="bg-surface-3 border border-surface-border text-slate-500 text-xs font-mono px-4 py-1.5 rounded-lg hover:text-slate-300 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function TeamPage() {
  const { token, role } = useAuthStore()
  const [users, setUsers] = useState<TeamUser[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [tab, setTab] = useState<'users' | 'invites'>('users')
  const [showInviteForm, setShowInviteForm] = useState(false)

  const isOwner = role === 'owner'

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/team/users`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.ok) setUsers(data.data)
    } catch {}
  }, [token])

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/team/invites`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.ok) setInvites(data.data)
    } catch {}
  }, [token])

  useEffect(() => {
    fetchUsers()
    fetchInvites()
  }, [fetchUsers, fetchInvites])

  const changeRole = async (userId: number, newRole: UserRole) => {
    await fetch(`${API_URL}/api/team/users/${userId}/role`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    fetchUsers()
  }

  const removeUser = async (userId: number) => {
    if (!confirm('Delete this user?')) return
    await fetch(`${API_URL}/api/team/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchUsers()
  }

  const removeInvite = async (id: string) => {
    await fetch(`${API_URL}/api/team/invites/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchInvites()
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in max-w-3xl">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['users', 'invites'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[11px] font-mono rounded capitalize transition-all ${
                tab === t
                  ? 'bg-accent-blue/15 border border-accent-blue/30 text-accent-blue'
                  : 'bg-surface-2 border border-surface-border text-slate-500 hover:text-slate-300'
              }`}
            >{t} {t === 'users' ? `(${users.length})` : `(${invites.length})`}</button>
          ))}
        </div>
        {tab === 'invites' && (
          <button onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-1.5 bg-surface-2 border border-surface-border text-slate-400 text-[11px] font-mono px-3 py-1.5 rounded-lg hover:text-slate-200 transition-all">
            <UserPlus size={11} /> Invite
          </button>
        )}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="flex flex-col gap-2">
          {users.length === 0 && (
            <div className="bg-surface-2 border border-surface-border rounded-lg p-8 text-center">
              <Users size={24} className="text-slate-600 mx-auto mb-2" />
              <div className="text-slate-500 text-xs font-mono">No team members found</div>
            </div>
          )}
          {users.map(user => (
            <div key={user.id} className="bg-surface-2 border border-surface-border rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-slate-200 font-mono">{user.username}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono flex items-center gap-2">
                  {user.email && <><Mail size={10} /> {user.email}</>}
                  {user.lastLoginAt && (
                    <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(user.lastLoginAt)}</span>
                  )}
                </div>
              </div>
              {isOwner && (
                <select
                  value={user.role}
                  onChange={e => changeRole(user.id, e.target.value as UserRole)}
                  className="bg-surface-3 border border-surface-border rounded px-2 py-1 text-[10px] text-slate-300 font-mono outline-none"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              )}
              {isOwner && (
                <button onClick={() => removeUser(user.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invites Tab */}
      {tab === 'invites' && (
        <div className="flex flex-col gap-3">
          {showInviteForm && <InviteForm onCreated={() => { fetchInvites(); setShowInviteForm(false) }} onCancel={() => setShowInviteForm(false)} />}

          {invites.length === 0 && !showInviteForm && (
            <div className="bg-surface-2 border border-surface-border rounded-lg p-8 text-center">
              <Mail size={24} className="text-slate-600 mx-auto mb-2" />
              <div className="text-slate-500 text-xs font-mono">No pending invites</div>
            </div>
          )}

          {invites.map(invite => (
            <div key={invite.id} className="bg-surface-2 border border-surface-border rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Mail size={11} className="text-slate-500" />
                  <span className="text-xs text-slate-300 font-mono">{invite.email}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${ROLE_COLORS[invite.role]}`}>{invite.role}</span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono flex items-center gap-2">
                  <Clock size={10} /> Expires {formatDate(invite.expiresAt)}
                  <span className="text-slate-700">·</span>
                  <span>{invite.token.slice(0, 12)}...</span>
                </div>
              </div>
              <button onClick={() => removeInvite(invite.id)}
                className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
