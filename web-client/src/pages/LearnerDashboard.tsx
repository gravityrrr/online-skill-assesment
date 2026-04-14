import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  History,
  PlayCircle,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  instructorSecondaryButtonClass,
} from '../components/InstructorWorkspaceShell'
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

  const surfaceClass =
    'rounded-3xl border border-white/5 bg-slate-800/30 shadow-[0_20px_70px_rgba(2,6,23,0.65)] backdrop-blur-xl'

  const widgetClass =
    'group rounded-3xl border border-white/5 bg-slate-800/30 p-5 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10'

  const subtleButtonClass =
    'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all duration-300 ease-out hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'

  const primaryGlowButtonClass =
    'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_50px_rgba(99,102,241,0.25)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_28px_70px_rgba(34,211,238,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-60'

  const cardClass =
    'group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-800/30 p-5 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/10 hover:shadow-2xl hover:shadow-indigo-500/10'

  useEffect(() => {
    void fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    setLearnerLabel(user?.email || 'Learner')

    const [{ data: assessmentRows, error: assessmentError }, { data: courseRows, error: courseError }] = await Promise.all([
      supabase
        .from('assessments')
        .select('assessment_id, course_id, title, time_limit, created_at')
        .order('created_at', { ascending: false }),
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

      if (resultsError) {
        setError(resultsError.message)
        setLoading(false)
        return
      }

      resultRows = (data as ResultRow[]) ?? []
    }

    setAssessments((assessmentRows as AssessmentRow[]) ?? [])
    setResults(resultRows)

    const nextCourses: Record<string, string> = {}
    ;((courseRows as CourseRow[]) ?? []).forEach((course) => {
      nextCourses[course.course_id] = course.title
    })
    setCourses(nextCourses)
    setLoading(false)
  }

  const averageScore = useMemo(() => {
    if (results.length === 0) return 0
    return Math.round(results.reduce((sum, row) => sum + Number(row.score || 0), 0) / results.length)
  }, [results])

  const passCount = useMemo(
    () => results.filter((result) => result.status === 'pass').length,
    [results],
  )

  const passRate = useMemo(() => {
    if (results.length === 0) return 0
    return Math.round((passCount / results.length) * 100)
  }, [passCount, results.length])

  const recentResults = useMemo(() => results.slice(0, 8), [results])

  const progressByAssessment = useMemo(() => {
    const map: Record<string, AssessmentProgress> = {}
    results.forEach((result) => {
      const existing = map[result.assessment_id]
      if (!existing) {
        map[result.assessment_id] = {
          attempts: 1,
          bestScore: Number(result.score || 0),
          latestStatus: result.status,
        }
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
    return assessments.filter((assessment) => {
      const courseTitle = courses[assessment.course_id] || ''
      return assessment.title.toLowerCase().includes(term) || courseTitle.toLowerCase().includes(term)
    })
  }, [assessmentSearch, assessments, courses])

  const assessmentPages = Math.max(1, Math.ceil(filteredAssessments.length / pageSize))
  const resultsPages = Math.max(1, Math.ceil(recentResults.length / pageSize))

  const assessmentRows = useMemo(() => {
    const safePage = Math.min(assessmentPage, assessmentPages)
    const start = (safePage - 1) * pageSize
    return filteredAssessments.slice(start, start + pageSize)
  }, [assessmentPage, assessmentPages, filteredAssessments])

  const resultRows = useMemo(() => {
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
    () => new Set(results.map((row) => row.assessment_id)).size,
    [results],
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950" />
        <div className="absolute left-[-140px] top-[-160px] h-80 w-80 rounded-full bg-indigo-500/16 blur-3xl" />
        <div className="absolute right-[-150px] top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-160px] left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`${surfaceClass} p-4 sm:p-5 lg:sticky lg:top-6`}>
            <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Learner command</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">Focus dashboard</h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Launch attempts fast, track progress, and keep momentum—everything in one premium workspace.
              </p>
            </div>

            <nav className="mt-4 grid gap-2">
              <a
                href="#assessments"
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-indigo-500/10"
              >
                Assessment queue
              </a>
              <a
                href="#results"
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-indigo-500/10"
              >
                Recent results
              </a>
            </nav>

            <div className="mt-4 grid gap-3">
              <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/10 hover:shadow-xl hover:shadow-emerald-500/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pass rate</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-200">{passRate}%</p>
              </div>
              <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/10 hover:shadow-xl hover:shadow-sky-500/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Active assessments</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-sky-200">{activeAssessmentCount}</p>
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <header className={`${surfaceClass} relative overflow-hidden px-5 py-6 sm:px-6`}>
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-indigo-500/10 blur-2xl" />
                <div className="absolute right-0 top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl" />
              </div>

              <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/10 text-indigo-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Learner dashboard</p>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                      Welcome back, <span className="text-white">{learnerLabel}</span>
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                      Your personal command center for starting assessments, tracking attempts, and reviewing results.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
                  <button type="button" className={subtleButtonClass} onClick={() => void fetchData()}>
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition-all duration-300 ease-out hover:bg-rose-500/20"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </header>

            {error ? (
              <section className="flex items-start gap-3 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100 backdrop-blur-xl">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-200" />
                <span>{error}</span>
              </section>
            ) : null}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className={widgetClass}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Available assessments</p>
                    <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{assessments.length}</p>
                    <p className="mt-2 text-xs text-slate-500">Ready in your queue</p>
                  </div>
                  <span className="rounded-2xl border border-white/5 bg-indigo-500/10 p-2 text-indigo-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                    <BookOpenCheck className="h-5 w-5" />
                  </span>
                </div>
              </article>
              <article className={widgetClass}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Attempts submitted</p>
                    <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{results.length}</p>
                    <p className="mt-2 text-xs text-slate-500">Total submissions</p>
                  </div>
                  <span className="rounded-2xl border border-white/5 bg-sky-500/10 p-2 text-sky-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                    <History className="h-5 w-5" />
                  </span>
                </div>
              </article>
              <article className={widgetClass}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Average score</p>
                    <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{averageScore}%</p>
                    <p className="mt-2 text-xs text-slate-500">Across all attempts</p>
                  </div>
                  <span className="rounded-2xl border border-white/5 bg-emerald-500/10 p-2 text-emerald-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                    <Target className="h-5 w-5" />
                  </span>
                </div>
              </article>
              <article className={widgetClass}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Passed attempts</p>
                    <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{passCount}</p>
                    <p className="mt-2 text-xs text-slate-500">{passRate}% success rate</p>
                  </div>
                  <span className="rounded-2xl border border-white/5 bg-emerald-500/10 p-2 text-emerald-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                </div>
              </article>
            </section>

            <section id="assessments" className={`${surfaceClass} p-6`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Assessment queue</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Start a new attempt</h2>
                </div>

                <label className="relative w-full max-w-md sm:w-[340px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-300 ease-out focus:border-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Filter by assessment or course"
                    value={assessmentSearch}
                    onChange={(event) => {
                      setAssessmentSearch(event.target.value)
                      setAssessmentPage(1)
                    }}
                  />
                </label>
              </div>

              {loading ? (
                <p className="mt-5 text-sm text-slate-400">Loading assessments...</p>
              ) : filteredAssessments.length === 0 ? (
                <div className="mt-5 overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-indigo-500/10 text-indigo-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                    <BookOpenCheck className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">No assessments yet</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Try a different filter, or check back when new assessments are published.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {assessmentRows.map((assessment) => {
                      const progress = progressByAssessment[assessment.assessment_id]
                      const latestStatus = progress?.latestStatus ?? 'none'

                      return (
                        <article key={assessment.assessment_id} className={cardClass}>
                          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100">
                            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-indigo-500/10 blur-2xl" />
                            <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl" />
                          </div>

                          <div className="relative">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                              {courses[assessment.course_id] || 'Unknown course'}
                            </p>
                            <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">{assessment.title}</h3>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 transition-all duration-300 ease-out hover:border-white/20">
                              <p>Time limit</p>
                              <p className="mt-1 text-sm font-semibold tracking-tight text-slate-100">{assessment.time_limit} min</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 transition-all duration-300 ease-out hover:border-white/20">
                              <p>Best score</p>
                              <p className="mt-1 text-sm font-semibold tracking-tight text-slate-100">{progress?.bestScore ?? 0}%</p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Attempts: {progress?.attempts ?? 0}</span>
                            {latestStatus === 'none' ? (
                              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1 text-slate-300">
                                No result yet
                              </span>
                            ) : latestStatus === 'pass' ? (
                              <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-2 py-1 text-emerald-100">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Last: pass
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-xl border border-rose-300/20 bg-rose-500/10 px-2 py-1 text-rose-100">
                                <XCircle className="h-3.5 w-3.5" />
                                Last: fail
                              </span>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={`${primaryGlowButtonClass} animate-[pulse_2.4s_ease-in-out_infinite] hover:animate-none`}
                              onClick={() => navigate(`/assessments/${assessment.assessment_id}/take`)}
                            >
                              <PlayCircle className="h-4 w-4" />
                              Start assessment
                            </button>
                            <button
                              type="button"
                              className={subtleButtonClass}
                              onClick={() => navigate(`/assessments/${assessment.assessment_id}/history`)}
                            >
                              <History className="h-4 w-4" />
                              History
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      className={subtleButtonClass}
                      disabled={assessmentPage <= 1}
                      onClick={() => setAssessmentPage((page) => Math.max(1, page - 1))}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-300">
                      Page {Math.min(assessmentPage, assessmentPages)} of {assessmentPages}
                    </span>
                    <button
                      type="button"
                      className={subtleButtonClass}
                      disabled={assessmentPage >= assessmentPages}
                      onClick={() => setAssessmentPage((page) => Math.min(assessmentPages, page + 1))}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </section>

            <section id="results" className={`${surfaceClass} p-6`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Recent activity</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Latest results</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 backdrop-blur-xl">
                  <Clock3 className="h-4 w-4" />
                  Ordered by newest attempt
                </div>
              </div>

              {recentResults.length === 0 ? (
                <div className="mt-5 overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-sky-500/10 text-sky-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                    <History className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">No attempts submitted yet</h3>
                  <p className="mt-2 text-sm text-slate-400">Complete your first assessment to unlock results history.</p>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {resultRows.map((result) => {
                      const assessmentTitle =
                        assessments.find((assessment) => assessment.assessment_id === result.assessment_id)?.title ||
                        'Unknown assessment'

                      return (
                        <article key={result.result_id} className={cardClass}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{assessmentTitle}</p>
                              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{result.score}%</p>
                            </div>
                            {result.status === 'pass' ? (
                              <span className="inline-flex items-center gap-1 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-100">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                PASS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-100">
                                <XCircle className="h-3.5 w-3.5" />
                                FAIL
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-sm text-slate-400">{formatTime(result.created_at)}</p>

                          <button
                            type="button"
                            className={`mt-4 ${subtleButtonClass}`}
                            onClick={() => navigate(`/assessments/${result.assessment_id}/history`)}
                          >
                            View full history
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                        </article>
                      )
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      className={subtleButtonClass}
                      disabled={resultsPage <= 1}
                      onClick={() => setResultsPage((page) => Math.max(1, page - 1))}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-300">
                      Page {Math.min(resultsPage, resultsPages)} of {resultsPages}
                    </span>
                    <button
                      type="button"
                      className={subtleButtonClass}
                      disabled={resultsPage >= resultsPages}
                      onClick={() => setResultsPage((page) => Math.min(resultsPages, page + 1))}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
