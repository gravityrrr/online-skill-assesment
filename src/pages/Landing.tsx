import { ArrowRight, GraduationCap, Shield, UserCircle2, Sparkles, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Dynamic Backgrounds */}
      <div className="ambient-glow bg-indigo-600/20 w-[600px] h-[600px] top-[-20%] left-[-10%]" />
      <div className="ambient-glow bg-emerald-600/10 w-[500px] h-[500px] bottom-[-20%] right-[-10%]" />

      {/* Top Bar with Branding */}
      <nav className="w-full px-8 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <span className="text-2xl heading-bold tracking-tight text-white drop-shadow-sm">Evalura</span>
        </div>
        
        <button
          onClick={() => navigate('/login/admin')}
          className="btn-secondary !px-4 !py-2 !text-xs !rounded-full opacity-80 hover:opacity-100"
        >
          <Shield className="w-4 h-4 mr-1" /> Admin Access
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10 animate-fade-in">
        <div className="text-center max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 rounded-full text-sm font-semibold mb-6 shadow-xl backdrop-blur-md">
            <Sparkles className="w-4 h-4" /> Next-Gen Assessment Platform
          </div>
          <h1 className="text-5xl md:text-7xl heading-bold leading-tight mb-6">
            Elevate Learning with <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">Precision.</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] font-medium max-w-2xl mx-auto">
            A deeply immersive, beautiful workspace tailored for instructors to build and learners to master skills. Focus, execute, and analyze in real-time.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Learner */}
          <article
            onClick={() => navigate('/login/learner')}
            className="glass-panel p-10 cursor-pointer group hover:-translate-y-2 relative overflow-hidden"
          >
            {/* Hover Gradient Inject */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10 w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 shadow-lg transition-transform group-hover:scale-110">
              <UserCircle2 className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl heading-bold mb-3">Learner Portal</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
              Step into your immersive learning environment. Take assigned assessments, track progression, and unlock your potential.
            </p>
            
            <div className="flex items-center text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
              Enter Workspace <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </div>
          </article>

          {/* Instructor */}
          <article
            onClick={() => navigate('/login/instructor')}
            className="glass-panel p-10 cursor-pointer group hover:-translate-y-2 relative overflow-hidden"
          >
            {/* Hover Gradient Inject */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative z-10 w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 shadow-lg transition-transform group-hover:scale-110">
              <GraduationCap className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl heading-bold mb-3">Instructor Portal</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
              Design powerful assessments, monitor candidate performance, and manage your educational workflow effortlessly.
            </p>
            
            <div className="flex items-center text-sm font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
              Enter Workspace <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </div>
          </article>
        </div>
      </main>
    </div>
  )
}
