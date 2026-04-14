import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Database, Lock, Mail, ShieldCheck, Sparkles, User } from 'lucide-react'

interface AuthProps {
  role: 'Learner' | 'Instructor' | 'Admin'
  type: 'Login' | 'Register'
}

const surface = 'rounded-3xl border border-white/10 bg-slate-900/75 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl'

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
    ? { Icon: Database, color: 'text-rose-300', bg: 'bg-rose-500/15' }
    : isInstructor
      ? { Icon: ShieldCheck, color: 'text-sky-300', bg: 'bg-sky-500/15' }
      : { Icon: Sparkles, color: 'text-indigo-300', bg: 'bg-indigo-500/15' }

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

  const inputCls = 'w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-indigo-500/12 blur-3xl" />
        <div className="absolute right-[-80px] bottom-[-100px] h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className={`${surface} w-full max-w-[440px] animate-rise p-7 sm:p-8`}>
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconConfig.bg} ${iconConfig.color}`}>
              <iconConfig.Icon className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{contextLabel} access</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {type === 'Login' ? 'Welcome back' : `Create ${contextLabel.toLowerCase()} account`}
            </h1>
            <p className="text-sm text-slate-400">Use your registered email and password to continue securely.</p>
          </div>

          {/* Feedback */}
          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {type === 'Register' && !isAdmin && (
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input type="text" required className={inputCls} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input type="email" required className={inputCls} placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input type="password" required className={inputCls} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60">
              {loading ? 'Please wait...' : type === 'Login' ? `Sign in as ${contextLabel.toLowerCase()}` : 'Create account'}
            </button>

            {canUseGoogle && (
              <>
                <div className="text-center text-xs text-slate-500">or</div>
                <button type="button" disabled={oauthLoading} onClick={() => void handleGoogleAuth()} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-60">
                  {oauthLoading ? 'Redirecting to Google...' : type === 'Login' ? 'Continue with Google' : 'Sign up with Google'}
                </button>
              </>
            )}
          </form>

          {/* Footer */}
          <div className="mt-6 space-y-3 text-center">
            {!isAdmin && (
              <button type="button" onClick={() => navigate(type === 'Login' ? `/register/${role.toLowerCase()}` : `/login/${role.toLowerCase()}`)} className="text-sm font-medium text-indigo-300 transition hover:text-indigo-200">
                {type === 'Login' ? 'Need an account? Register here' : 'Already registered? Sign in'}
              </button>
            )}
            <div>
              <button type="button" onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-slate-300">
                <ArrowLeft className="h-3.5 w-3.5" /> Return to portal selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
