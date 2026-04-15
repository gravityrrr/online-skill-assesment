import { ArrowRight, GraduationCap, Shield, Sparkles, UserCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0b0c0f] text-slate-200 overflow-hidden relative">
      {/* ── Dynamic Glowing Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-sky-600/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[700px] h-[700px] rounded-full bg-violet-600/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-20 sm:px-6 animate-rise">

        {/* ── Hero ── */}
        <header className="text-center w-full max-w-[800px] flex flex-col items-center">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-5 py-2 backdrop-blur-md shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all hover:bg-indigo-500/20">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
              Skill Assessment Platform
            </span>
          </div>

          <h1 className="mt-8 text-5xl font-black tracking-tighter sm:text-6xl md:text-7xl">
            <span className="block text-white">Choose Your</span>
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 drop-shadow-lg">
              Workflow
            </span>
          </h1>
          <p className="mt-8 w-full max-w-2xl text-lg sm:text-xl font-medium leading-relaxed text-slate-400">
            A focused workspace for learners, instructors, and administrators to run secure assessment workflows. Deep insights, pure focus.
          </p>
        </header>

        {/* ── Portal cards ── */}
        <div className="mt-16 grid w-full max-w-[900px] gap-8 sm:grid-cols-2 perspective-1000">

          {/* Learner card */}
          <article
            onClick={() => navigate('/login/learner')}
            className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#101218]/60 p-10 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:bg-[#151821]/80 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:border-sky-500/20 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
            
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-sky-500/10 border border-sky-500/20 text-sky-400 transition-transform duration-500 group-hover:scale-110 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
              <UserCircle2 className="h-8 w-8" />
            </div>
            
            <h2 className="mt-8 text-2xl font-bold tracking-tight text-white group-hover:text-sky-100 transition-colors">
              Learner Portal
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">
              Open assigned assessments, monitor focus progress, and review historical results in your dedicated learning environment.
            </p>
            
            <button type="button" className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/5 px-6 py-3 text-sm font-bold text-white transition-all group-hover:bg-sky-500 group-hover:border-sky-500 group-hover:shadow-[0_0_30px_rgba(56,189,248,0.4)]">
              Enter as Learner <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </article>

          {/* Instructor card */}
          <article
            onClick={() => navigate('/login/instructor')}
            className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#101218]/60 p-10 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:bg-[#151821]/80 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:border-indigo-500/20 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
            
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 transition-transform duration-500 group-hover:scale-110 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              <GraduationCap className="h-8 w-8" />
            </div>
            
            <h2 className="mt-8 text-2xl font-bold tracking-tight text-white group-hover:text-indigo-100 transition-colors">
              Instructor Portal
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">
              Build assessments, manage your courses, and track class performance signals with powerful analytics.
            </p>
            
            <button type="button" className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/5 px-6 py-3 text-sm font-bold text-white transition-all group-hover:bg-indigo-500 group-hover:border-indigo-500 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]">
              Enter as Instructor <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </article>
        </div>

        {/* ── Admin link ── */}
        <div className="mt-16">
          <button
            type="button"
            onClick={() => navigate('/login/admin')}
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-5 py-2.5 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20"
          >
            <Shield className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">Admin Access</span>
          </button>
        </div>
      </div>
    </div>
  )
}
