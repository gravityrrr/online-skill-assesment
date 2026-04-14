import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, CheckCircle2, Clock, LogOut, RefreshCcw, ShieldAlert, ShieldCheck, UserCheck, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const surface = 'rounded-3xl border border-white/10 bg-slate-900/75 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl'
const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed'
const btnSecondary = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed'

interface PendingInstructor {
  id: string
  name: string
  email: string
  created_at: string
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '??'
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [pendingUsers, setPendingUsers] = useState<PendingInstructor[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 })

  useEffect(() => { void fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    const [{ data: pending }, { count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] = await Promise.all([
      supabase.from('users').select('id, name, email, created_at').eq('role', 'Instructor').eq('approval_state', 'pending').order('created_at', { ascending: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'Instructor').eq('approval_state', 'pending'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'Instructor').eq('approval_state', 'approved'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'Instructor').eq('approval_state', 'rejected'),
    ])
    setPendingUsers((pending as PendingInstructor[]) ?? [])
    setStats({ pending: pendingCount ?? 0, approved: approvedCount ?? 0, rejected: rejectedCount ?? 0 })
    setLoading(false)
  }

  const handleApprove = async (userId: string) => {
    setActionLoadingId(userId)
    const { error } = await supabase.rpc('approve_instructor', { target_user_id: userId })
    if (error) alert(`Approval failed: ${error.message}`)
    else await fetchDashboardData()
    setActionLoadingId(null)
  }

  const handleReject = async (userId: string) => {
    setActionLoadingId(userId)
    const { error } = await supabase.rpc('reject_instructor', { target_user_id: userId })
    if (error) alert(`Reject failed: ${error.message}`)
    else await fetchDashboardData()
    setActionLoadingId(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const metricCards = [
    { label: 'Pending', value: stats.pending, sub: 'Awaiting admin action', Icon: Clock, color: 'text-amber-300', bg: 'bg-amber-500/10' },
    { label: 'Approved', value: stats.approved, sub: 'Currently active', Icon: UserCheck, color: 'text-emerald-300', bg: 'bg-emerald-500/10' },
    { label: 'Rejected', value: stats.rejected, sub: 'Declined applications', Icon: XCircle, color: 'text-rose-300', bg: 'bg-rose-500/10' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-indigo-500/12 blur-3xl" />
        <div className="absolute right-[-100px] bottom-[-80px] h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          {/* Header */}
          <header className={`${surface} px-5 py-5 sm:px-6`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Administration</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Instructor approvals</h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Approve or reject onboarding requests with explicit state tracking.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className={btnSecondary} onClick={() => void fetchDashboardData()}>
                  <RefreshCcw className="h-4 w-4" /> Refresh
                </button>
                <button type="button" onClick={handleLogout} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          </header>

          {/* Metrics */}
          <section className="grid gap-4 sm:grid-cols-3">
            {metricCards.map(({ label, value, sub, Icon, color, bg }) => (
              <article key={label} className={`${surface} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{label} instructors</p>
                    <p className="mt-2 text-4xl font-semibold text-white">{value}</p>
                    <p className="mt-2 text-xs text-slate-500">{sub}</p>
                  </div>
                  <div className={`rounded-2xl ${bg} p-3 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </article>
            ))}
          </section>

          {/* Pending list */}
          <section className={`${surface} p-6`}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Pending queue</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Instructor requests</h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                {loading ? 'Loading...' : `${pendingUsers.length} pending`}
              </div>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-900/70" />)}
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">All clear</h3>
                  <p className="mt-2 text-sm text-slate-400">No instructor approval requests pending right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.map((user) => (
                    <article key={user.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-sm font-semibold text-indigo-200">
                          {initials(user.name || '')}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{user.name || 'Unnamed user'}</h3>
                          <p className="mt-1 text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20" onClick={() => void handleReject(user.id)} disabled={actionLoadingId === user.id}>
                          <Ban className="h-3.5 w-3.5" /> Reject
                        </button>
                        <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400" onClick={() => void handleApprove(user.id)} disabled={actionLoadingId === user.id}>
                          <ShieldAlert className="h-3.5 w-3.5" /> {actionLoadingId === user.id ? 'Updating...' : 'Approve'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
