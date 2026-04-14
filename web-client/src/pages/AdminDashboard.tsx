import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface PendingInstructor {
  id: string
  name: string
  email: string
  created_at: string
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [pendingUsers, setPendingUsers] = useState<PendingInstructor[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 })

  useEffect(() => {
    void fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)

    const [{ data: pending }, { count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, email, created_at')
        .eq('role', 'Instructor')
        .eq('approval_state', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'Instructor')
        .eq('approval_state', 'pending'),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'Instructor')
        .eq('approval_state', 'approved'),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'Instructor')
        .eq('approval_state', 'rejected'),
    ])

    setPendingUsers((pending as PendingInstructor[]) ?? [])
    setStats({
      pending: pendingCount ?? 0,
      approved: approvedCount ?? 0,
      rejected: rejectedCount ?? 0,
    })

    setLoading(false)
  }

  const handleApprove = async (userId: string) => {
    setActionLoadingId(userId)
    const { error } = await supabase.rpc('approve_instructor', { target_user_id: userId })
    if (error) {
      alert(`Approval failed: ${error.message}`)
    } else {
      await fetchDashboardData()
    }
    setActionLoadingId(null)
  }

  const handleReject = async (userId: string) => {
    setActionLoadingId(userId)
    const { error } = await supabase.rpc('reject_instructor', { target_user_id: userId })
    if (error) {
      alert(`Reject failed: ${error.message}`)
    } else {
      await fetchDashboardData()
    }
    setActionLoadingId(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="shell" style={{ justifyContent: 'flex-start', paddingTop: 52 }}>
      <div className="orb orb-left" />
      <section className="panel card animate-rise" style={{ width: 'min(960px, 100%)' }}>
        <div className="admin-header">
          <div>
            <p className="eyebrow">Administration</p>
            <h1 className="title" style={{ marginTop: 8 }}>Instructor approvals</h1>
            <p className="subtitle" style={{ marginTop: 10 }}>Approve or reject onboarding requests with explicit state tracking.</p>
          </div>
          <div className="admin-actions">
            <button type="button" className="secondary-btn" onClick={() => void fetchDashboardData()}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button type="button" className="text-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </div>

        <div className="metric-grid" style={{ marginTop: 20 }}>
          <article className="metric-card">
            <p>Pending instructors</p>
            <h2>{stats.pending}</h2>
            <span>Awaiting admin action</span>
          </article>
          <article className="metric-card">
            <p>Approved instructors</p>
            <h2>{stats.approved}</h2>
            <span>Currently active</span>
          </article>
          <article className="metric-card">
            <p>Rejected instructors</p>
            <h2>{stats.rejected}</h2>
            <span>Declined applications</span>
          </article>
        </div>

        {loading ? (
          <p className="subtitle" style={{ marginTop: 24 }}>Loading pending instructors...</p>
        ) : pendingUsers.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 24 }}>
            <CheckCircle2 size={34} />
            <h2>All clear</h2>
            <p>There are no instructor approvals pending right now.</p>
          </div>
        ) : (
          <div className="approval-list" style={{ marginTop: 24 }}>
            {pendingUsers.map((user) => (
              <article key={user.id} className="approval-item">
                <div>
                  <h3>{user.name || 'Unnamed user'}</h3>
                  <p>{user.email}</p>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => void handleReject(user.id)}
                    disabled={actionLoadingId === user.id}
                  >
                    <Ban size={16} /> Reject
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => void handleApprove(user.id)}
                    disabled={actionLoadingId === user.id}
                  >
                    <ShieldAlert size={16} /> {actionLoadingId === user.id ? 'Updating...' : 'Approve'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
