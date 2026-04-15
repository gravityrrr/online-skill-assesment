import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  History,
  LogOut,
  PlayCircle,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface AssessmentRow {
  assessment_id: string
  course_id: string
  title: string
  time_limit: number
  created_at: string
}

interface CourseRow {
  course_id: string
  title: string
}

interface ResultRow {
  result_id: string
  assessment_id: string
  score: number
  status: 'pass' | 'fail'
  created_at: string
}

interface AssessmentProgress {
  attempts: number
  bestScore: number
  latestStatus: 'pass' | 'fail' | 'none'
}

export default function LearnerDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [learnerLabel, setLearnerLabel] = useState('')
  const [assessments, setAssessments] = useState<AssessmentRow[]>([])
  const [courses, setCourses] = useState<Record<string, string>>({})
  const [results, setResults] = useState<ResultRow[]>([])
  const [assessmentSearch, setAssessmentSearch] = useState('')
  const [assessmentPage, setAssessmentPage] = useState(1)
  const [resultsPage, setResultsPage] = useState(1)

  const pageSize = 6

  useEffect(() => {
    void fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError('')

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) { setError(userError.message); setLoading(false); return }

    setLearnerLabel(user?.email || 'Learner')

    const [{ data: assessmentRows, error: assessmentError }, { data: courseRows, error: courseError }] = await Promise.all([
      supabase.from('assessments').select('assessment_id, course_id, title, time_limit, created_at').order('created_at', { ascending: false }),
      supabase.from('courses').select('course_id, title'),
    ])

    if (assessmentError || courseError) {
      setError(assessmentError?.message || courseError?.message || 'Unable to load dashboard data.')
      setLoading(false)
      return
    }

    let resultRows: ResultRow[] = []
    if (user) {
      const { data, error: resultsError } = await supabase
        .from('results')
        .select('result_id, assessment_id, score, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (resultsError) { setError(resultsError.message); setLoading(false); return }
      resultRows = (data as ResultRow[]) ?? []
    }

    setAssessments((assessmentRows as AssessmentRow[]) ?? [])
    setResults(resultRows)
    const nextCourses: Record<string, string> = {}
    ;((courseRows as CourseRow[]) ?? []).forEach(c => { nextCourses[c.course_id] = c.title })
    setCourses(nextCourses)
    setLoading(false)
  }

  const averageScore = useMemo(() => {
    if (results.length === 0) return 0
    return Math.round(results.reduce((sum, row) => sum + Number(row.score || 0), 0) / results.length)
  }, [results])

  const passCount = useMemo(() => results.filter(r => r.status === 'pass').length, [results])

  const passRate = useMemo(() => {
    if (results.length === 0) return 0
    return Math.round((passCount / results.length) * 100)
  }, [passCount, results.length])

  const recentResults = useMemo(() => results.slice(0, 8), [results])

  const progressByAssessment = useMemo(() => {
    const map: Record<string, AssessmentProgress> = {}
    results.forEach(result => {
      const existing = map[result.assessment_id]
      if (!existing) {
        map[result.assessment_id] = { attempts: 1, bestScore: Number(result.score || 0), latestStatus: result.status }
        return
      }
      map[result.assessment_id] = {
        attempts: existing.attempts + 1,
        bestScore: Math.max(existing.bestScore, Number(result.score || 0)),
        latestStatus: existing.latestStatus,
      }
    })
    return map
  }, [results])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const filteredAssessments = useMemo(() => {
    const term = assessmentSearch.trim().toLowerCase()
    if (!term) return assessments
    return assessments.filter(a => {
      const courseTitle = courses[a.course_id] || ''
      return a.title.toLowerCase().includes(term) || courseTitle.toLowerCase().includes(term)
    })
  }, [assessmentSearch, assessments, courses])

  const assessmentPages = Math.max(1, Math.ceil(filteredAssessments.length / pageSize))
  const resultsPages = Math.max(1, Math.ceil(recentResults.length / pageSize))

  const pagedAssessments = useMemo(() => {
    const safePage = Math.min(assessmentPage, assessmentPages)
    const start = (safePage - 1) * pageSize
    return filteredAssessments.slice(start, start + pageSize)
  }, [assessmentPage, assessmentPages, filteredAssessments])

  const pagedResults = useMemo(() => {
    const safePage = Math.min(resultsPage, resultsPages)
    const start = (safePage - 1) * pageSize
    return recentResults.slice(start, start + pageSize)
  }, [recentResults, resultsPage, resultsPages])

  const formatTime = (value: string) => {
    const timestamp = new Date(value)
    if (Number.isNaN(timestamp.getTime())) return value
    return timestamp.toLocaleString()
  }

  const activeAssessmentCount = useMemo(
    () => new Set(results.map(r => r.assessment_id)).size,
    [results],
  )

  const statCards = [
    { label: 'Available assessments', value: assessments.length, sub: 'Ready in your queue', Icon: BookOpenCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Attempts submitted', value: results.length, sub: 'Total submissions', Icon: History, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { label: 'Average score', value: `${averageScore}%`, sub: 'Across all attempts', Icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Passed attempts', value: passCount, sub: `${passRate}% success rate`, Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ]

  return (
    <div className="min-h-screen bg-[#0b0c0f] text-slate-200">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-sky-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-8">
            <div className="rounded-[2rem] border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">Learner</p>
                  <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-white tracking-tight">
                    Focus Mode
                  </h2>
                </div>
              </div>
              <p className="mt-5 text-sm text-slate-400 leading-relaxed">
                Launch attempts fast, track your progression, and keep your momentum building.
              </p>
            </div>

            <nav className="rounded-[2rem] border border-white/5 bg-slate-900/40 p-4 backdrop-blur-xl shadow-2xl">
              <p className="mb-4 px-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Navigation</p>
              <div className="grid gap-1">
                <a href="#assessments" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 transition-colors group-hover:bg-indigo-500/20 group-hover:text-indigo-300">
                    <BookOpenCheck className="h-4 w-4" />
                  </span>
                  Assessment Queue
                </a>
                <a href="#results" className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 transition-colors group-hover:bg-sky-500/20 group-hover:text-sky-300">
                    <History className="h-4 w-4" />
                  </span>
                  Recent Results
                </a>
              </div>
            </nav>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[1.5rem] border border-white/5 bg-slate-900/40 p-5 text-center backdrop-blur-xl shadow-lg transition-transform hover:scale-105">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Pass Rate</p>
                <p className="mt-2 text-2xl font-black text-emerald-400">{passRate}%</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/5 bg-slate-900/40 p-5 text-center backdrop-blur-xl shadow-lg transition-transform hover:scale-105">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Active</p>
                <p className="mt-2 text-2xl font-black text-sky-400">{activeAssessmentCount}</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="space-y-8">
            {/* Header Banner */}
            <header className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-indigo-900/30 via-slate-900/60 to-[#0b0c0f] p-8 sm:p-12 hover-lift hover-glow shadow-2xl animate-rise">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
              <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[80px] transition-all duration-700 group-hover:bg-indigo-400/20" />
              
              <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                    <Target className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-[10px] font-black uppercase tracking-[0.2em] text-transparent">
                      Learner Dashboard
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                      Welcome back, <span className="text-transparent bg-gradient-to-r from-indigo-300 to-sky-300 bg-clip-text">{learnerLabel.split('@')[0]}</span>
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                      Your personal command center for starting assessments, pushing your boundaries, and tracking your steady progression.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => void fetchData()} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 hover:text-white" title="Refresh">
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={handleSignOut} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-400 transition-all hover:bg-rose-500/20 hover:text-rose-300">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </div>
            </header>

            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-200 backdrop-blur-md">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                <p>{error}</p>
              </div>
            )}

            {/* Stat Cards */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(({ label, value, sub, Icon, color, bg }, i) => (
                <article key={label} className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl hover-lift shadow-lg">
                  <div className={`absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${bg.replace('/10', '/5')}`} />
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-start justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${bg} ${color} transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 max-w-[100px] text-right">{label}</p>
                    </div>
                    <div className="mt-6">
                      <p className="text-4xl font-extrabold text-white tracking-tighter">{value}</p>
                      <p className="mt-1 text-xs text-slate-400">{sub}</p>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            {/* Assessment Queue */}
            <section id="assessments" className="rounded-[2.5rem] border border-white/5 bg-[#101218]/60 p-8 sm:p-10 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between border-b border-white/5 pb-8">
                <div>
                  <p className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.2em] text-transparent">
                    Assessment Queue
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Ready for Action</h2>
                </div>
                <div className="relative w-full sm:w-[320px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    className="w-full rounded-full border border-white/10 bg-black/40 py-2.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 backdrop-blur-md focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    placeholder="Filter by title..."
                    value={assessmentSearch}
                    onChange={e => { setAssessmentSearch(e.target.value); setAssessmentPage(1) }}
                  />
                </div>
              </div>

              {loading ? (
                <div className="mt-8 space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}
                </div>
              ) : filteredAssessments.length === 0 ? (
                <div className="mt-8 flex flex-col items-center justify-center min-h-[300px] rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                    <BookOpenCheck className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-white">Queue Empty</h3>
                  <p className="mt-2 text-sm text-slate-400 max-w-sm">
                    {assessmentSearch ? 'We couldnt find any assessments matching your filter.' : 'You have no assessments pending. Great job staying on top of your work!'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {pagedAssessments.map(assessment => {
                      const progress = progressByAssessment[assessment.assessment_id]
                      const latestStatus = progress?.latestStatus ?? 'none'
                      return (
                        <article key={assessment.assessment_id} className="group flex flex-col rounded-[2rem] border border-white/5 bg-black/40 p-6 backdrop-blur-md transition-all hover:-translate-y-2 hover:bg-slate-900/60 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 line-clamp-1">{courses[assessment.course_id] || 'General'}</p>
                          <h3 className="mt-2 text-lg font-bold text-white tracking-tight line-clamp-2 min-h-[56px]">{assessment.title}</h3>

                          <div className="mt-6 flex justify-between rounded-xl bg-white/5 p-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Duration</p>
                              <p className="mt-1 text-sm font-semibold text-slate-200">{assessment.time_limit}m</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Best Score</p>
                              <p className="mt-1 text-lg font-black text-sky-400 leading-none">{progress?.bestScore ?? 0}%</p>
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-5">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</span>
                              <div className="mt-1 flex items-center gap-1.5">
                                {latestStatus === 'none' ? (
                                  <span className="text-xs font-semibold text-slate-400">Untouched</span>
                                ) : latestStatus === 'pass' ? (
                                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Passed</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs font-bold text-rose-400"><XCircle className="h-3.5 w-3.5" /> Failed</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/assessments/${assessment.assessment_id}/history`)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                                title="History"
                              >
                                <History className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/assessments/${assessment.assessment_id}/take`)}
                                className="flex h-9 items-center gap-2 rounded-full bg-indigo-500/20 px-4 text-xs font-bold text-indigo-300 transition-all hover:bg-indigo-500/30 hover:text-white"
                              >
                                Start
                                <PlayCircle className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  {assessmentPages > 1 && (
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                      <button type="button" className="rounded-full bg-white/5 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5" disabled={assessmentPage <= 1} onClick={() => setAssessmentPage(p => Math.max(1, p - 1))}>
                        Prev
                      </button>
                      <span className="text-sm font-medium text-slate-400">
                        {Math.min(assessmentPage, assessmentPages)} / {assessmentPages}
                      </span>
                      <button type="button" className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-5 py-2 text-sm font-bold text-indigo-300 transition-all hover:bg-indigo-500/20 disabled:opacity-30" disabled={assessmentPage >= assessmentPages} onClick={() => setAssessmentPage(p => Math.min(assessmentPages, p + 1))}>
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Recent Results */}
            <section id="results" className="rounded-[2.5rem] border border-white/5 bg-[#101218]/60 p-8 sm:p-10 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/5 pb-8">
                <div>
                  <p className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.2em] text-transparent">
                    History
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Latest Submissions</h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                  <Clock3 className="h-3.5 w-3.5" /> Newest First
                </span>
              </div>

              {recentResults.length === 0 ? (
                <div className="mt-8 flex flex-col items-center justify-center min-h-[240px] rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
                    <History className="h-8 w-8" />
                  </div>
                  <p className="mt-4 text-sm text-slate-500">Your recent attempts will populate here.</p>
                </div>
              ) : (
                <>
                  <div className="mt-8 grid gap-4 lg:grid-cols-2">
                    {pagedResults.map(result => {
                      const assessmentTitle = assessments.find(a => a.assessment_id === result.assessment_id)?.title || 'Unknown assessment'
                      const isPass = result.status === 'pass'
                      return (
                        <article key={result.result_id} className="group relative flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-black/40 p-5 transition-all hover:bg-slate-900/60 hover:shadow-lg">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">{assessmentTitle}</p>
                            <div className="mt-2 flex items-center gap-3">
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${isPass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                {isPass ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {result.status}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500">{formatTime(result.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white/5 border border-white/5 text-center">
                            <span className="text-lg font-black leading-none text-white">{result.score}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Score</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/assessments/${result.assessment_id}/history`)}
                            className="absolute inset-0 z-10 w-full h-full opacity-0 hover:cursor-pointer"
                            title="View full history"
                          >
                          </button>
                        </article>
                      )
                    })}
                  </div>

                  {resultsPages > 1 && (
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                      <button type="button" className="rounded-full bg-white/5 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5" disabled={resultsPage <= 1} onClick={() => setResultsPage(p => Math.max(1, p - 1))}>
                        Prev
                      </button>
                      <span className="text-xs font-medium text-slate-400">
                        {Math.min(resultsPage, resultsPages)} / {resultsPages}
                      </span>
                      <button type="button" className="rounded-full bg-white/5 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-30" disabled={resultsPage >= resultsPages} onClick={() => setResultsPage(p => Math.min(resultsPages, p + 1))}>
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

          </main>
        </div>
      </div>
    </div>
  )
}
