import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, CheckCircle2, Clock, LogOut, RefreshCcw, ShieldAlert, ShieldCheck, UserCheck, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'

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
  const [actionError, setActionError] = useState('')
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
    setActionError('')
    const { error } = await supabase.rpc('approve_instructor', { target_user_id: userId })
    if (error) setActionError(`Approval failed: ${error.message}`)
    else await fetchDashboardData()
    setActionLoadingId(null)
  }

  const handleReject = async (userId: string) => {
    setActionLoadingId(userId)
    setActionError('')
    const { error } = await supabase.rpc('reject_instructor', { target_user_id: userId })
    if (error) setActionError(`Reject failed: ${error.message}`)
    else await fetchDashboardData()
    setActionLoadingId(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const metricCards = [
    { label: 'Pending', value: stats.pending, sub: 'Awaiting admin action', Icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'Approved', value: stats.approved, sub: 'Currently active', Icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Rejected', value: stats.rejected, sub: 'Declined applications', Icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  ]

  return (
    <AppShell maxWidthClassName="max-w-[1100px]">
      <div className="grid gap-6">
        <PageHeader
          eyebrow="Administration"
          title="Instructor approvals"
          subtitle="Approve or reject onboarding requests with explicit state tracking."
          tone="danger"
          icon={<ShieldCheck className="h-5 w-5" />}
          actions={
            <>
              <button type="button" className="btn-secondary" onClick={() => void fetchDashboardData()}>
                <RefreshCcw className="h-4 w-4" /> Refresh
              </button>
              <button type="button" onClick={handleLogout} className="btn-danger">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </>
          }
        />

        <section className="grid gap-4 sm:grid-cols-3">
          {metricCards.map(({ label, value, sub, Icon, color, bg, border }) => (
            <StatCard
              key={label}
              label={`${label} instructors`}
              value={value}
              sub={sub}
              icon={<Icon className="h-5 w-5" />}
              iconWrapperClassName={`${bg} ${border}`}
              iconClassName={color}
            />
          ))}
        </section>

        <SectionCard>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="label-micro">Pending queue</p>
                <h2 className="mt-2 heading-lg">Instructor requests</h2>
              </div>
              <span className="badge badge-neutral">
                {loading ? 'Loading...' : `${pendingUsers.length} pending`}
              </span>
            </div>

            {/* Action error */}
            {actionError && (
              <div className="alert alert-error mt-4">
                <XCircle className="alert-icon h-4 w-4" />
                {actionError}
              </div>
            )}

            <div className="mt-7">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="skeleton h-20" />)}
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ background: 'var(--success-soft)', borderColor: 'var(--success-border)', color: 'var(--success)' }}>
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="empty-state-title">All clear</p>
                  <p className="empty-state-body">No instructor approval requests pending right now.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <article
                      key={user.id}
                      className="panel approval-item flex-col sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold"
                          style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}
                        >
                          {initials(user.name || '')}
                        </div>
                        <div>
                          <h3 className="heading-md">{user.name || 'Unnamed user'}</h3>
                          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-danger"
                          style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                          onClick={() => void handleReject(user.id)}
                          disabled={actionLoadingId === user.id}
                        >
                          <Ban className="h-3.5 w-3.5" /> Reject
                        </button>
                        <button
                          type="button"
                          className="btn-success"
                          style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                          onClick={() => void handleApprove(user.id)}
                          disabled={actionLoadingId === user.id}
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          {actionLoadingId === user.id ? 'Updating...' : 'Approve'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
        </SectionCard>
      </div>
    </AppShell>
  )
}
