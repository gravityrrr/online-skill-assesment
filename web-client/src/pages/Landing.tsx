import { ArrowRight, GraduationCap, Shield, Sparkles, UserCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="app-page">
      {/* Background orbs */}
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-primary bg-orb-tl" />
        <div className="bg-orb bg-orb-secondary bg-orb-tr" />
        <div className="bg-orb bg-orb-tertiary bg-orb-bl" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6">

        {/* ── Hero ── */}
        <header className="animate-rise text-center" style={{ maxWidth: 720 }}>
          {/* Eyebrow pill */}
          <div
            className="mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: 'var(--primary-soft)',
              border: '1px solid var(--primary-border)',
              animation: 'glow-pulse 3s ease-in-out infinite',
            }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
            <span className="label-micro" style={{ color: 'var(--primary)' }}>
              Skill Assessment Platform
            </span>
          </div>

          <h1
            className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl"
            style={{ color: 'var(--text-main)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
          >
            Choose your{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, var(--text-main), var(--primary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              portal
            </span>
          </h1>
          <p
            className="mx-auto mt-5 max-w-lg text-base leading-7"
            style={{ color: 'var(--text-secondary)' }}
          >
            A focused workspace for learners, instructors, and administrators to run secure assessment workflows.
          </p>
        </header>

        {/* ── Portal cards ── */}
        <div className="mt-12 grid w-full max-w-[820px] gap-5 sm:grid-cols-2">

          {/* Learner card */}
          <article
            onClick={() => navigate('/login/learner')}
            className="panel-interactive cursor-pointer p-7 stagger-1 animate-rise"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}
            >
              <UserCircle2 className="h-7 w-7" />
            </div>
            <h2
              className="mt-5 text-xl font-bold tracking-tight"
              style={{ color: 'var(--text-main)', letterSpacing: '-0.02em' }}
            >
              Learner portal
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Open assigned assessments, monitor progress, and review historical results.
            </p>
            <button
              type="button"
              className="btn-primary mt-5 w-full"
              style={{ padding: '13px 20px' }}
              onClick={e => { e.stopPropagation(); navigate('/login/learner') }}
            >
              Continue as learner <ArrowRight className="h-4 w-4" />
            </button>
          </article>

          {/* Instructor card */}
          <article
            onClick={() => navigate('/login/instructor')}
            className="panel-interactive cursor-pointer p-7 stagger-2 animate-rise"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'var(--primary-soft)', color: 'var(--accent-sky)', border: '1px solid var(--primary-border)' }}
            >
              <GraduationCap className="h-7 w-7" />
            </div>
            <h2
              className="mt-5 text-xl font-bold tracking-tight"
              style={{ color: 'var(--text-main)', letterSpacing: '-0.02em' }}
            >
              Instructor portal
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Build assessments, manage courses, and track class performance signals.
            </p>
            <button
              type="button"
              className="btn-secondary mt-5 w-full"
              style={{ padding: '13px 20px' }}
              onClick={e => { e.stopPropagation(); navigate('/login/instructor') }}
            >
              Continue as instructor <ArrowRight className="h-4 w-4" />
            </button>
          </article>
        </div>

        {/* Admin link */}
        <div className="mt-8 stagger-3 animate-rise">
          <button
            type="button"
            onClick={() => navigate('/login/admin')}
            className="panel-inset inline-flex items-center gap-2 rounded-full px-4 py-2 transition-all hover:-translate-y-0.5"
          >
            <Shield className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="label-micro">Admin sign-in</span>
          </button>
        </div>
      </div>
    </div>
  )
}
