import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AlertCircle, ArrowLeft, CheckCircle2, Database, Lock, Mail, ShieldCheck, Sparkles, User } from 'lucide-react'

interface AuthProps {
  role: 'Learner' | 'Instructor' | 'Admin'
  type: 'Login' | 'Register'
}

export default function DynamicAuth({ role, type }: AuthProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isInstructor = role === 'Instructor'
  const isAdmin = role === 'Admin'
  const canUseGoogle = type === 'Login' || role === 'Learner'
  const contextLabel = isAdmin ? 'Admin' : isInstructor ? 'Instructor' : 'Learner'

  const iconConfig = isAdmin
    ? { Icon: Database, iconStyle: { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-border)' } }
    : isInstructor
      ? { Icon: ShieldCheck, iconStyle: { background: 'var(--primary-soft)', color: 'var(--accent-sky)', border: '1px solid var(--primary-border)' } }
      : { Icon: Sparkles, iconStyle: { background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)' } }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (type === 'Register') {
      if (isAdmin) {
        setLoading(false)
        setError('Admin accounts cannot be self-registered. Use controlled provisioning.')
        return
      }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role } } })
      if (error) {
        setError(error.message)
      } else if (isInstructor) {
        setSuccess('Registration complete. Your instructor account is waiting for admin approval.')
      } else if (data.session) {
        navigate('/learner-dashboard', { replace: true })
      } else {
        setSuccess('Registration complete. Please verify your email, then sign in.')
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        const { data: dbRow } = await supabase.from('users').select('role').eq('id', data.user.id).maybeSingle()
        const dbRole = dbRow?.role
        if (dbRole && dbRole !== role) {
          await supabase.auth.signOut()
          setError(`This account is registered as "${dbRole}". Please use the ${dbRole} portal to sign in.`)
          setLoading(false)
          return
        }
        return
      }
    }
    setLoading(false)
  }

  const handleGoogleAuth = async () => {
    if (type === 'Register' && role !== 'Learner') {
      setError('Google sign-up is enabled for learner accounts only.')
      return
    }
    setOauthLoading(true)
    setError('')
    setSuccess('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) { setError(error.message); setOauthLoading(false) }
  }

  return (
    <div className="app-page">
      {/* Background orbs */}
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-primary bg-orb-tl" />
        <div className="bg-orb bg-orb-secondary bg-orb-br" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="panel w-full max-w-[440px] animate-rise p-7 sm:p-8">

          {/* ── Header ── */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={iconConfig.iconStyle}
            >
              <iconConfig.Icon className="h-6 w-6" />
            </div>
            <p className="label-micro">{contextLabel} access</p>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--text-main)', letterSpacing: '-0.02em' }}
            >
              {type === 'Login' ? 'Welcome back' : `Create ${contextLabel.toLowerCase()} account`}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Use your registered email and password to continue securely.
            </p>
          </div>

          {/* ── Feedback banners ── */}
          {error && (
            <div className="alert alert-error mt-5">
              <AlertCircle className="alert-icon h-4 w-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success mt-5">
              <CheckCircle2 className="alert-icon h-4 w-4" />
              {success}
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            {type === 'Register' && !isAdmin && (
              <div className="input-with-icon">
                <User className="input-icon-left h-4 w-4" />
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}
            <div className="input-with-icon">
              <Mail className="input-icon-left h-4 w-4" />
              <input
                type="email"
                required
                className="input-field"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="input-with-icon">
              <Lock className="input-icon-left h-4 w-4" />
              <input
                type="password"
                required
                className="input-field"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary full-width mt-1"
              style={{ padding: '13px 20px' }}
            >
              {loading ? 'Please wait...' : type === 'Login' ? `Sign in as ${contextLabel.toLowerCase()}` : 'Create account'}
            </button>

            {canUseGoogle && (
              <>
                <div className="auth-divider">or</div>
                <button
                  type="button"
                  disabled={oauthLoading}
                  onClick={() => void handleGoogleAuth()}
                  className="btn-secondary full-width"
                  style={{ padding: '13px 20px' }}
                >
                  {oauthLoading ? 'Redirecting to Google...' : type === 'Login' ? 'Continue with Google' : 'Sign up with Google'}
                </button>
              </>
            )}
          </form>

          {/* ── Footer ── */}
          <div className="mt-6 space-y-3 text-center">
            {!isAdmin && (
              <button
                type="button"
                onClick={() => navigate(type === 'Login' ? `/register/${role.toLowerCase()}` : `/login/${role.toLowerCase()}`)}
                className="text-sm font-medium transition"
                style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {type === 'Login' ? 'Need an account? Register here' : 'Already registered? Sign in'}
              </button>
            )}
            <div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '7px 14px' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Return to portal selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
