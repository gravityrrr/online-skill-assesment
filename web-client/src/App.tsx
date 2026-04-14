import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle'
import { ensureProfile, type AppProfile } from './lib/profile'
import { supabase } from './lib/supabase'
import AdminDashboard from './pages/AdminDashboard'
import DynamicAuth from './pages/auth/DynamicAuth'
import InstructorAssessmentReviews from './pages/InstructorAssessmentReviews'
import InstructorDashboard from './pages/InstructorDashboard'
import LearnerAssessmentHistory from './pages/LearnerAssessmentHistory'
import Landing from './pages/Landing'
import LearnerDashboard from './pages/LearnerDashboard'
import TakeAssessment from './pages/TakeAssessment'

type ThemeMode = 'light' | 'dark'

function LoadingView() {
  return (
    <div className="shell">
      <section className="panel card" style={{ maxWidth: 420 }}>
        <p className="eyebrow">Preparing workspace</p>
        <h1 className="title" style={{ marginTop: 8, fontSize: '1.4rem' }}>Checking secure session...</h1>
      </section>
    </div>
  )
}

function ProfileUnavailableView({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <div className="shell">
      <section className="panel card" style={{ maxWidth: 700 }}>
        <div className="admin-header" style={{ marginBottom: 8 }}>
          <p className="eyebrow">Session issue</p>
          <button type="button" className="text-btn" onClick={() => void onSignOut()}>
            Sign out
          </button>
        </div>
        <h1 className="title" style={{ marginTop: 8 }}>Profile could not be loaded</h1>
        <p className="subtitle" style={{ marginTop: 12 }}>
          Your session is active, but we could not read your user profile. Please sign in again.
        </p>
      </section>
    </div>
  )
}

function ApprovalStateView({
  name,
  heading,
  detail,
  onSignOut,
}: {
  name: string
  heading: string
  detail: string
  onSignOut: () => Promise<void>
}) {
  return (
    <div className="shell">
      <section className="panel card" style={{ maxWidth: 700 }}>
        <div className="admin-header" style={{ marginBottom: 8 }}>
          <p className="eyebrow">Instructor onboarding</p>
          <button type="button" className="text-btn" onClick={() => void onSignOut()}>
            Sign out
          </button>
        </div>
        <h1 className="title" style={{ marginTop: 8 }}>{heading}</h1>
        <p className="subtitle" style={{ marginTop: 12 }}>
          Hi {name}, {detail}
        </p>
      </section>
    </div>
  )
}

function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('ui-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ui-theme', theme)
  }, [theme])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setSession(session)
      setLoadingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    if (!session?.user?.id) {
      setProfile(null)
      setLoadingProfile(false)
      return
    }

    setLoadingProfile(true)
    const loadProfile = async () => {
      if (!active) return

      const resolvedProfile = await ensureProfile(session.user)

      if (!active) return

      setProfile(resolvedProfile)

      setLoadingProfile(false)
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [session])

  const defaultRoute = useMemo(() => {
    if (!session) return '/'
    if (!profile) return '/profile-unavailable'
    if (profile.role === 'Admin') return '/admin-dashboard'
    if (profile.role === 'Instructor' && profile.approval_state === 'rejected') return '/approval-declined'
    if (profile.role === 'Instructor' && !profile.is_approved) return '/pending-approval'
    if (profile.role === 'Instructor') return '/instructor-dashboard'
    return '/learner-dashboard'
  }, [profile, session])

  if (loadingSession || loadingProfile) return <LoadingView />

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <BrowserRouter>
      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
      />

      <Routes>
        <Route path="/" element={!session ? <Landing /> : <Navigate to={defaultRoute} replace />} />

        <Route
          path="/profile-unavailable"
          element={session && !profile ? <ProfileUnavailableView onSignOut={handleSignOut} /> : <Navigate to={defaultRoute} replace />}
        />

        <Route
          path="/login/learner"
          element={!session ? <DynamicAuth role="Learner" type="Login" /> : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/register/learner"
          element={!session ? <DynamicAuth role="Learner" type="Register" /> : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/learner-dashboard"
          element={
            session && profile?.role === 'Learner' ? <LearnerDashboard /> : (
              <Navigate to={defaultRoute} replace />
            )
          }
        />
        <Route
          path="/assessments/:assessmentId/take"
          element={session && profile?.role === 'Learner' ? <TakeAssessment /> : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/assessments/:assessmentId/history"
          element={session && profile?.role === 'Learner' ? <LearnerAssessmentHistory /> : <Navigate to={defaultRoute} replace />}
        />

        <Route
          path="/login/instructor"
          element={!session ? <DynamicAuth role="Instructor" type="Login" /> : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/register/instructor"
          element={!session ? <DynamicAuth role="Instructor" type="Register" /> : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/pending-approval"
          element={
            session && profile?.role === 'Instructor' && profile?.approval_state === 'pending' ? (
              <ApprovalStateView
                name={profile.name || 'there'}
                heading="Approval in review"
                detail="your instructor profile is waiting for admin approval. We will unlock your dashboard as soon as approval is complete."
                onSignOut={handleSignOut}
              />
            ) : (
              <Navigate to={defaultRoute} replace />
            )
          }
        />
        <Route
          path="/approval-declined"
          element={
            session && profile?.role === 'Instructor' && profile?.approval_state === 'rejected' ? (
              <ApprovalStateView
                name={profile.name || 'there'}
                heading="Application declined"
                detail="your instructor request was declined. Please contact an administrator if you need this reviewed again."
                onSignOut={handleSignOut}
              />
            ) : (
              <Navigate to={defaultRoute} replace />
            )
          }
        />
        <Route
          path="/instructor-dashboard"
          element={
            session && profile?.role === 'Instructor' && profile?.is_approved ? <InstructorDashboard /> : (
              <Navigate to={defaultRoute} replace />
            )
          }
        />
        <Route
          path="/instructor/assessments/:assessmentId/reviews"
          element={
            session && profile?.role === 'Instructor' && profile?.is_approved ? <InstructorAssessmentReviews /> : (
              <Navigate to={defaultRoute} replace />
            )
          }
        />

        <Route
          path="/login/admin"
          element={!session ? <DynamicAuth role="Admin" type="Login" /> : <Navigate to={defaultRoute} replace />}
        />
        <Route
          path="/admin-dashboard"
          element={session && profile?.role === 'Admin' ? <AdminDashboard /> : <Navigate to={defaultRoute} replace />}
        />

        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
