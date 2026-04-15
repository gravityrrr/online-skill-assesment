import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Award, CheckCircle2, Clock3, History, RefreshCcw, Target, TrendingUp, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ResultRow { result_id: string; score: number; status: 'pass' | 'fail'; created_at: string }
interface AnswerRow { result_id: string; question_id: string; selected_answer: string; is_correct: boolean }
interface QuestionRow { question_id: string; question_text: string }

export default function LearnerAssessmentHistory() {
  const navigate = useNavigate()
  const { assessmentId } = useParams()
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('Assessment history')
  const [results, setResults] = useState<ResultRow[]>([])
  const [answers, setAnswers] = useState<AnswerRow[]>([])
  const [questions, setQuestions] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { void fetchHistory() }, [assessmentId])

  const fetchHistory = async () => {
    if (!assessmentId) return
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('You need to sign in again.'); setLoading(false); return }

    const [{ data: assessment }, { data: resultRows, error: resultsError }, { data: questionRows }] = await Promise.all([
      supabase.from('assessments').select('title').eq('assessment_id', assessmentId).single(),
      supabase.from('results').select('result_id, score, status, created_at').eq('assessment_id', assessmentId).eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('questions').select('question_id, question_text').eq('assessment_id', assessmentId),
    ])
    if (assessment?.title) setTitle(assessment.title)
    if (resultsError) { setError(resultsError.message); setLoading(false); return }

    const nextResults = (resultRows as ResultRow[]) ?? []
    setResults(nextResults)
    const qMap: Record<string, string> = {}
    ;((questionRows as QuestionRow[]) ?? []).forEach(r => { qMap[r.question_id] = r.question_text })
    setQuestions(qMap)

    if (nextResults.length > 0) {
      const ids = nextResults.map(r => r.result_id)
      const { data: answerRows } = await supabase.from('result_answers').select('result_id, question_id, selected_answer, is_correct').in('result_id', ids)
      setAnswers((answerRows as AnswerRow[]) ?? [])
    } else { setAnswers([]) }
    setLoading(false)
  }

  const average = useMemo(() => {
    if (results.length === 0) return 0
    return Math.round(results.reduce((s, r) => s + Number(r.score || 0), 0) / results.length)
  }, [results])

  const bestScore = useMemo(() => results.length > 0 ? Math.max(...results.map(r => Number(r.score || 0))) : 0, [results])

  const answersByResult = useMemo(() => {
    const map: Record<string, AnswerRow[]> = {}
    answers.forEach(a => { if (!map[a.result_id]) map[a.result_id] = []; map[a.result_id].push(a) })
    return map
  }, [answers])

  const metrics = [
    { label: 'Total attempts', value: results.length, sub: 'Across this assessment', Icon: History, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { label: 'Best score', value: `${bestScore}%`, sub: 'Highest attempt', Icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Average score', value: `${average}%`, sub: 'Overall trend', Icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  ]

  return (
    <div className="app-page">
      {/* Background orbs */}
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-primary bg-orb-tl" />
        <div className="bg-orb bg-orb-secondary bg-orb-br" />
      </div>

      <div className="relative mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6">

          {/* ── Header ── */}
          <header className="panel-raised px-6 py-6 sm:px-7 animate-rise">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}
                >
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="label-micro">Learner portal</p>
                  <h1
                    className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
                    style={{ color: 'var(--text-main)', letterSpacing: '-0.025em' }}
                  >
                    {title}
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                    All your attempts for this assessment.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" className="btn-secondary" onClick={() => void fetchHistory()}>
                  <RefreshCcw className="h-4 w-4" /> Refresh
                </button>
                <button type="button" className="btn-secondary" onClick={() => navigate('/learner-dashboard')}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              </div>
            </div>
          </header>

          {/* Error */}
          {error && (
            <div className="alert alert-error">
              <XCircle className="alert-icon h-4 w-4" />
              {error}
            </div>
          )}

          {/* ── Metric cards ── */}
          <section className="grid gap-4 sm:grid-cols-3">
            {metrics.map(({ label, value, sub, Icon, color, bg }, i) => (
              <article
                key={label}
                className={`panel stat-card stagger-${i + 1} animate-rise`}
              >
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

          {/* ── Attempt log ── */}
          <section className="panel p-7 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="label-micro">Attempt log</p>
                <h2 className="mt-3 heading-lg">Your submissions</h2>
              </div>
              <span className="badge badge-neutral inline-flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5" /> Newest first
              </span>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="skeleton h-24" />)}
                </div>
              ) : results.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <History className="h-6 w-6" />
                  </div>
                  <p className="empty-state-title">No attempts yet</p>
                  <p className="empty-state-body">Take this assessment to generate your first result.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map(result => {
                    const isExpanded = expanded === result.result_id
                    const resultAnswers = answersByResult[result.result_id] || []
                    return (
                      <article key={result.result_id} className="panel-interactive overflow-hidden">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-4 p-4 text-left"
                          onClick={() => setExpanded(isExpanded ? null : result.result_id)}
                        >
                          <div className="flex items-center gap-4">
                            {/* Score badge */}
                            <div
                              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold font-numeric"
                              style={{
                                background: result.status === 'pass' ? 'var(--success-soft)' : 'var(--danger-soft)',
                                color: result.status === 'pass' ? 'var(--success-text)' : 'var(--danger-text)',
                                border: `1px solid ${result.status === 'pass' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                              }}
                            >
                              {result.score}%
                            </div>
                            <div>
                              <span className={`badge ${result.status === 'pass' ? 'badge-pass' : 'badge-fail'}`}>
                                {result.status === 'pass'
                                  ? <><CheckCircle2 className="h-3 w-3" /> Pass</>
                                  : <><XCircle className="h-3 w-3" /> Fail</>}
                              </span>
                              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                                {new Date(result.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                            {isExpanded ? 'Hide' : 'Show'} details
                          </span>
                        </button>

                        {isExpanded && resultAnswers.length > 0 && (
                          <div className="px-4 pb-4 pt-0">
                            <hr className="divider mb-4" />
                            <div className="space-y-2">
                              {resultAnswers.map(answer => (
                                <div
                                  key={`${result.result_id}-${answer.question_id}`}
                                  className="panel-inset flex items-start gap-3 px-3 py-2.5 text-sm"
                                >
                                  {answer.is_correct
                                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--success)' }} />
                                    : <XCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--danger)' }} />}
                                  <div className="min-w-0">
                                    <p className="font-medium" style={{ color: 'var(--text-main)' }}>
                                      {questions[answer.question_id] || 'Question'}
                                    </p>
                                    <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                      Answer: {answer.selected_answer || 'No answer'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
