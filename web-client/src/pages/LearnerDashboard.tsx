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
    <div className="app-page">
      {/* Background orbs */}
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-primary bg-orb-tl" />
        <div className="bg-orb bg-orb-secondary bg-orb-tr" />
        <div className="bg-orb bg-orb-tertiary bg-orb-bl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">

          {/* ── Sidebar ── */}
          <aside className="panel-raised p-4 sm:p-5 lg:sticky lg:top-6">
            {/* Brand */}
            <div className="panel-inset p-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-white"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))' }}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="label-micro">Learner command</p>
                  <h2 className="mt-1 text-base font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                    Focus dashboard
                  </h2>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                Launch attempts fast, track progress, and keep momentum.
              </p>
            </div>

            {/* Nav */}
            <nav className="mt-4 grid gap-2">
              <p className="label-micro mb-1 px-1">Navigation</p>
              <a href="#assessments" className="nav-link">
                <span className="nav-link-icon"><BookOpenCheck className="h-4 w-4" /></span>
                Assessment queue
              </a>
              <a href="#results" className="nav-link">
                <span className="nav-link-icon"><History className="h-4 w-4" /></span>
                Recent results
              </a>
            </nav>

            {/* Sidebar stats */}
            <div className="mt-4 grid gap-3">
              <div className="panel-inset p-4">
                <p className="label-micro">Pass rate</p>
                <p className="mt-2 text-2xl font-bold tracking-tight" style={{ color: 'var(--success)' }}>
                  {passRate}%
                </p>
              </div>
              <div className="panel-inset p-4">
                <p className="label-micro">Active assessments</p>
                <p className="mt-2 text-2xl font-bold tracking-tight" style={{ color: 'var(--accent-sky)' }}>
                  {activeAssessmentCount}
                </p>
              </div>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="space-y-6">
            {/* Header */}
            <header className="panel-raised relative overflow-hidden px-6 py-7 animate-rise">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-indigo-500/10 blur-2xl" />
                <div className="absolute right-0 top-10 h-28 w-28 rounded-full" style={{ background: 'rgba(56,189,248,0.08)', filter: 'blur(40px)' }} />
              </div>
              <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}
                  >
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="label-micro">Learner dashboard</p>
                    <h1
                      className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
                      style={{ color: 'var(--text-main)', letterSpacing: '-0.025em' }}
                    >
                      Welcome back, <span style={{ color: 'var(--primary)' }}>{learnerLabel}</span>
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                      Your personal command center for starting assessments, tracking attempts, and reviewing results.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
                  <button type="button" className="btn-icon" onClick={() => void fetchData()} title="Refresh" aria-label="Refresh">
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                  <button type="button" className="btn-danger" style={{ fontSize: '0.8rem', padding: '9px 14px' }} onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </div>
            </header>

            {/* Error */}
            {error && (
              <div className="alert alert-error">
                <AlertCircle className="alert-icon h-4 w-4" />
                {error}
              </div>
            )}

            {/* ── Stat cards ── */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(({ label, value, sub, Icon, color, bg }, i) => (
                <article key={label} className={`panel stat-card stagger-${i + 1} animate-rise`}>
                  <div className="stat-card-body">
                    <p className="stat-card-label">{label}</p>
                    <p className="stat-card-value stat-number">{value}</p>
                    <p className="stat-card-sub">{sub}</p>
                  </div>
                  <div className={`stat-card-icon ${bg} ${color} border`} style={{ borderColor: 'var(--surface-border)' }}>
                    <Icon className="h-5 w-5" />
                  </div>
                </article>
              ))}
            </section>

            {/* ── Assessment queue ── */}
            <section id="assessments" className="panel p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="label-micro">Assessment queue</p>
                  <h2 className="mt-2 heading-lg">Start a new attempt</h2>
                </div>
                <div className="input-with-icon w-full max-w-md sm:w-[340px]">
                  <Search className="input-icon-left h-4 w-4" />
                  <input
                    className="input-field"
                    placeholder="Filter by assessment or course"
                    value={assessmentSearch}
                    onChange={e => { setAssessmentSearch(e.target.value); setAssessmentPage(1) }}
                  />
                </div>
              </div>

              {loading ? (
                <div className="mt-5 space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="skeleton h-32" />)}
                </div>
              ) : filteredAssessments.length === 0 ? (
                <div className="mt-5 empty-state">
                  <div className="empty-state-icon">
                    <BookOpenCheck className="h-6 w-6" />
                  </div>
                  <p className="empty-state-title">No assessments yet</p>
                  <p className="empty-state-body">
                    {assessmentSearch ? 'Try a different filter.' : 'Check back when new assessments are published.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {pagedAssessments.map(assessment => {
                      const progress = progressByAssessment[assessment.assessment_id]
                      const latestStatus = progress?.latestStatus ?? 'none'
                      return (
                        <article key={assessment.assessment_id} className="panel-interactive p-6">
                          <p className="label-micro">{courses[assessment.course_id] || 'Unknown course'}</p>
                          <h3 className="mt-2 heading-md">{assessment.title}</h3>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="panel-inset px-3 py-2">
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Time limit</p>
                              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                                {assessment.time_limit} min
                              </p>
                            </div>
                            <div className="panel-inset px-3 py-2">
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Best score</p>
                              <p className="mt-1 text-sm font-semibold font-numeric" style={{ color: 'var(--text-main)' }}>
                                {progress?.bestScore ?? 0}%
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              Attempts: {progress?.attempts ?? 0}
                            </span>
                            {latestStatus === 'none' ? (
                              <span className="badge badge-neutral">No result yet</span>
                            ) : latestStatus === 'pass' ? (
                              <span className="badge badge-pass"><CheckCircle2 className="h-3 w-3" /> Last: pass</span>
                            ) : (
                              <span className="badge badge-fail"><XCircle className="h-3 w-3" /> Last: fail</span>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => navigate(`/assessments/${assessment.assessment_id}/take`)}
                            >
                              <PlayCircle className="h-4 w-4" />
                              Start assessment
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
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
                    <button type="button" className="btn-secondary" disabled={assessmentPage <= 1} onClick={() => setAssessmentPage(p => Math.max(1, p - 1))}>
                      Previous
                    </button>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Page {Math.min(assessmentPage, assessmentPages)} of {assessmentPages}
                    </span>
                    <button type="button" className="btn-secondary" disabled={assessmentPage >= assessmentPages} onClick={() => setAssessmentPage(p => Math.min(assessmentPages, p + 1))}>
                      Next
                    </button>
                  </div>
                </>
              )}
            </section>

            {/* ── Recent results ── */}
            <section id="results" className="panel p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="label-micro">Recent activity</p>
                  <h2 className="mt-2 heading-lg">Latest results</h2>
                </div>
                <span className="badge badge-neutral inline-flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5" /> Newest first
                </span>
              </div>

              {recentResults.length === 0 ? (
                <div className="mt-5 empty-state">
                  <div className="empty-state-icon" style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary-border)', color: 'var(--accent-sky)' }}>
                    <History className="h-6 w-6" />
                  </div>
                  <p className="empty-state-title">No attempts submitted yet</p>
                  <p className="empty-state-body">Complete your first assessment to unlock results history.</p>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {pagedResults.map(result => {
                      const assessmentTitle = assessments.find(a => a.assessment_id === result.assessment_id)?.title || 'Unknown assessment'
                      return (
                        <article key={result.result_id} className="panel-interactive p-6">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="label-micro">{assessmentTitle}</p>
                              <p className="mt-2 stat-number font-numeric" style={{ color: 'var(--text-main)' }}>
                                {result.score}%
                              </p>
                            </div>
                            <span className={`badge ${result.status === 'pass' ? 'badge-pass' : 'badge-fail'}`}>
                              {result.status === 'pass'
                                ? <><CheckCircle2 className="h-3 w-3" /> Pass</>
                                : <><XCircle className="h-3 w-3" /> Fail</>}
                            </span>
                          </div>
                          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>{formatTime(result.created_at)}</p>
                          <button
                            type="button"
                            className="btn-secondary mt-4 w-full"
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
                    <button type="button" className="btn-secondary" disabled={resultsPage <= 1} onClick={() => setResultsPage(p => Math.max(1, p - 1))}>
                      Previous
                    </button>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Page {Math.min(resultsPage, resultsPages)} of {resultsPages}
                    </span>
                    <button type="button" className="btn-secondary" disabled={resultsPage >= resultsPages} onClick={() => setResultsPage(p => Math.min(resultsPages, p + 1))}>
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
