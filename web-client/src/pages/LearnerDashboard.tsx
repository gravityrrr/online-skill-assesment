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
  Target,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  instructorPrimaryButtonClass,
  instructorSecondaryButtonClass,
  instructorSurfaceClass,
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

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
        <div className="absolute left-[-110px] top-[-120px] h-72 w-72 rounded-full bg-indigo-500/12 blur-3xl" />
        <div className="absolute right-[-120px] top-28 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`${instructorSurfaceClass} p-4 sm:p-5 lg:sticky lg:top-6`}>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Learner portal</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Performance hub</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Start assessments quickly and track your latest outcomes in one clean workspace.
              </p>
            </div>

            <nav className="mt-4 grid gap-2">
              <a href="#assessments" className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10">
                Assessment queue
              </a>
              <a href="#results" className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10">
                Recent results
              </a>
            </nav>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pass rate</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-300">{passRate}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active assessments</p>
                <p className="mt-2 text-2xl font-semibold text-sky-300">{activeAssessmentCount}</p>
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <header className={`${instructorSurfaceClass} px-5 py-5 sm:px-6`}>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Learner dashboard</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Your learning workspace</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Explore available assessments, track pass/fail trends, and jump directly to attempt history.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className={instructorSecondaryButtonClass} onClick={() => void fetchData()}>
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </header>

            {error ? (
              <section className="flex items-start gap-3 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-200" />
                <span>{error}</span>
              </section>
            ) : null}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className={`${instructorSurfaceClass} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Available assessments</p>
                    <p className="mt-2 text-4xl font-semibold text-white">{assessments.length}</p>
                    <p className="mt-2 text-xs text-slate-500">Ready to attempt</p>
                  </div>
                  <BookOpenCheck className="h-5 w-5 text-indigo-300" />
                </div>
              </article>
              <article className={`${instructorSurfaceClass} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Attempts submitted</p>
                    <p className="mt-2 text-4xl font-semibold text-white">{results.length}</p>
                    <p className="mt-2 text-xs text-slate-500">All recorded submissions</p>
                  </div>
                  <History className="h-5 w-5 text-sky-300" />
                </div>
              </article>
              <article className={`${instructorSurfaceClass} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Average score</p>
                    <p className="mt-2 text-4xl font-semibold text-white">{averageScore}%</p>
                    <p className="mt-2 text-xs text-slate-500">Across all attempts</p>
                  </div>
                  <Target className="h-5 w-5 text-emerald-300" />
                </div>
              </article>
              <article className={`${instructorSurfaceClass} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Passed attempts</p>
                    <p className="mt-2 text-4xl font-semibold text-white">{passCount}</p>
                    <p className="mt-2 text-xs text-slate-500">{passRate}% success rate</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                </div>
              </article>
            </section>

            <section id="assessments" className={`${instructorSurfaceClass} p-6`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Assessment queue</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Start a new attempt</h2>
                </div>

                <label className="relative w-full max-w-md sm:w-[340px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300/50 focus:outline-none"
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
                <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
                  <h3 className="text-lg font-semibold text-white">No assessments found</h3>
                  <p className="mt-2 text-sm text-slate-400">Try another filter or check back when instructors publish new assessments.</p>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {assessmentRows.map((assessment) => {
                      const progress = progressByAssessment[assessment.assessment_id]
                      const latestStatus = progress?.latestStatus ?? 'none'

                      return (
                        <article key={assessment.assessment_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {courses[assessment.course_id] || 'Unknown course'}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-white">{assessment.title}</h3>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
                            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                              <p>Time limit</p>
                              <p className="mt-1 text-sm font-semibold text-slate-100">{assessment.time_limit} min</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                              <p>Best score</p>
                              <p className="mt-1 text-sm font-semibold text-slate-100">{progress?.bestScore ?? 0}%</p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Attempts: {progress?.attempts ?? 0}</span>
                            {latestStatus === 'none' ? (
                              <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-slate-300">No result yet</span>
                            ) : latestStatus === 'pass' ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-2 py-1 text-emerald-100">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Last: pass
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-rose-300/20 bg-rose-500/10 px-2 py-1 text-rose-100">
                                <XCircle className="h-3.5 w-3.5" />
                                Last: fail
                              </span>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={instructorPrimaryButtonClass}
                              onClick={() => navigate(`/assessments/${assessment.assessment_id}/take`)}
                            >
                              <PlayCircle className="h-4 w-4" />
                              Start
                            </button>
                            <button
                              type="button"
                              className={instructorSecondaryButtonClass}
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
                      className={instructorSecondaryButtonClass}
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
                      className={instructorSecondaryButtonClass}
                      disabled={assessmentPage >= assessmentPages}
                      onClick={() => setAssessmentPage((page) => Math.min(assessmentPages, page + 1))}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </section>

            <section id="results" className={`${instructorSurfaceClass} p-6`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Recent activity</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Latest results</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                  <Clock3 className="h-4 w-4" />
                  Ordered by newest attempt
                </div>
              </div>

              {recentResults.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
                  <h3 className="text-lg font-semibold text-white">No attempts submitted yet</h3>
                  <p className="mt-2 text-sm text-slate-400">Complete your first assessment to unlock result history.</p>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {resultRows.map((result) => {
                      const assessmentTitle =
                        assessments.find((assessment) => assessment.assessment_id === result.assessment_id)?.title ||
                        'Unknown assessment'

                      return (
                        <article key={result.result_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{assessmentTitle}</p>
                              <p className="mt-2 text-3xl font-semibold text-white">{result.score}%</p>
                            </div>
                            {result.status === 'pass' ? (
                              <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-100">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                PASS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-xl border border-rose-300/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-100">
                                <XCircle className="h-3.5 w-3.5" />
                                FAIL
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-sm text-slate-400">{formatTime(result.created_at)}</p>

                          <button
                            type="button"
                            className={`mt-4 ${instructorSecondaryButtonClass}`}
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
                      className={instructorSecondaryButtonClass}
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
                      className={instructorSecondaryButtonClass}
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
