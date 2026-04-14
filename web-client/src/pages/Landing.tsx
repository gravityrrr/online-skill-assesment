import { ArrowRight, GraduationCap, Shield, Sparkles, UserCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute right-[-100px] top-24 h-72 w-72 rounded-full bg-sky-500/12 blur-3xl" />
        <div className="absolute bottom-[-80px] left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        <header className="animate-rise text-center" style={{ maxWidth: 760 }}>
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            Skill Assessment Platform
          </div>
          <h1 className="mt-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Choose your portal
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-slate-400">
            A focused workspace for learners, instructors, and administrators to run secure assessment workflows.
          </p>
        </header>

        <div className="mt-10 grid w-full max-w-[820px] animate-rise gap-5 sm:grid-cols-2" style={{ animationDelay: '0.08s' }}>
          <article
            onClick={() => navigate('/login/learner')}
            className="group cursor-pointer rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/30 hover:shadow-[0_24px_64px_rgba(79,70,229,0.15)]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
              <UserCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">Learner portal</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Open assigned assessments, monitor progress, and review historical results.
            </p>
            <button type="button" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400">
              Continue as learner <ArrowRight className="h-4 w-4" />
            </button>
          </article>

          <article
            onClick={() => navigate('/login/instructor')}
            className="group cursor-pointer rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/30 hover:shadow-[0_24px_64px_rgba(56,189,248,0.12)]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">Instructor portal</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Build assessments, manage courses, and track class performance signals.
            </p>
            <button type="button" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400">
              Continue as instructor <ArrowRight className="h-4 w-4" />
            </button>
          </article>
        </div>

        <button
          type="button"
          onClick={() => navigate('/login/admin')}
          className="mt-8 inline-flex animate-rise items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-300"
          style={{ animationDelay: '0.15s' }}
        >
          <Shield className="h-4 w-4" />
          Admin sign-in
        </button>
      </div>
    </div>
  )
}
