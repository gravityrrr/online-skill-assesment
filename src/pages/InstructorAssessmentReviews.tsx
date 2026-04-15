import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, RefreshCcw, Search, ShieldCheck, Users, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AssessmentMeta { title: string }
interface ResultRow { result_id: string; user_id: string; score: number; status: 'pass' | 'fail'; created_at: string }
interface UserRow { id: string; name: string }
interface AnswerRow { result_id: string; question_id: string; selected_answer: string; is_correct: boolean }
interface QuestionRow { question_id: string; question_text: string }

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '??'
}

export default function InstructorAssessmentReviews() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('Assessment reviews')
  const [results, setResults] = useState<ResultRow[]>([])
  const [answers, setAnswers] = useState<AnswerRow[]>([])
  const [users, setUsers] = useState<Record<string, string>>({})
  const [questions, setQuestions] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { void fetchReviews() }, [assessmentId])

  const fetchReviews = async () => {
    if (!assessmentId) return
    setLoading(true); setError('')
    const [{ data: assessmentMeta }, { data: resultRows, error: resultError }, { data: questionRows }] = await Promise.all([
      supabase.from('assessments').select('title').eq('assessment_id', assessmentId).single(),
      supabase.from('results').select('result_id, user_id, score, status, created_at').eq('assessment_id', assessmentId).order('created_at', { ascending: false }),
      supabase.from('questions').select('question_id, question_text').eq('assessment_id', assessmentId),
    ])
    if (assessmentMeta) setTitle((assessmentMeta as AssessmentMeta).title)
    if (resultError) { setError(resultError.message); setLoading(false); return }

    const nextResults = (resultRows as ResultRow[]) ?? []
    setResults(nextResults)
    const qMap: Record<string, string> = {}
    ;((questionRows as QuestionRow[]) ?? []).forEach(q => { qMap[q.question_id] = q.question_text })
    setQuestions(qMap)

    if (nextResults.length === 0) { setUsers({}); setAnswers([]); setLoading(false); return }

    const learnerIds = [...new Set(nextResults.map(r => r.user_id))]
    const resultIds = nextResults.map(r => r.result_id)
    const [{ data: userRows }, { data: answerRows }] = await Promise.all([
      supabase.from('users').select('id, name').in('id', learnerIds),
      supabase.from('result_answers').select('result_id, question_id, selected_answer, is_correct').in('result_id', resultIds),
    ])
    const uMap: Record<string, string> = {}
    ;((userRows as UserRow[]) ?? []).forEach(u => { uMap[u.id] = u.name })
    setUsers(uMap)
    setAnswers((answerRows as AnswerRow[]) ?? [])
    setLoading(false)
  }

  const filteredResults = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return results
    return results.filter(r => (users[r.user_id] || 'Learner').toLowerCase().includes(term))
  }, [results, search, users])

  const answersByResult = useMemo(() => {
    const map: Record<string, AnswerRow[]> = {}
    answers.forEach(a => { if (!map[a.result_id]) map[a.result_id] = []; map[a.result_id].push(a) })
    return map
  }, [answers])

  const avgScore = useMemo(() => {
    if (results.length === 0) return 0
    return Math.round(results.reduce((s, r) => s + Number(r.score || 0), 0) / results.length)
  }, [results])

  const passRate = useMemo(() => {
    if (results.length === 0) return 0
    return Math.round((results.filter(r => r.status === 'pass').length / results.length) * 100)
  }, [results])

  return (
    <div className="app-page">
      {/* Background orbs */}
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-primary bg-orb-tl" />
        <div className="bg-orb bg-orb-secondary bg-orb-tr" />
      </div>

      <div className="relative mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6">

          {/* ── Header ── */}
          <header className="panel-raised px-6 py-6 sm:px-7 animate-rise">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: 'var(--primary-soft)', color: 'var(--accent-sky)', border: '1px solid var(--primary-border)' }}
                >
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="label-micro">Instructor portal</p>
                  <h1
                    className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
                    style={{ color: 'var(--text-main)', letterSpacing: '-0.025em' }}
                  >
                    {title}
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                    Review learner attempts and answer-level detail.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" className="btn-secondary" onClick={() => void fetchReviews()}>
                  <RefreshCcw className="h-4 w-4" /> Refresh
                </button>
                <button type="button" className="btn-secondary" onClick={() => navigate('/instructor-dashboard')}>
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

          {/* ── Metrics ── */}
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total submissions', value: results.length, Icon: Users, colorClass: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { label: 'Average score', value: `${avgScore}%`, Icon: CheckCircle2, colorClass: 'text-sky-400', bg: 'bg-sky-500/10' },
              { label: 'Pass rate', value: `${passRate}%`, Icon: CheckCircle2, colorClass: 'text-emerald-400', bg: 'bg-emerald-500/10', highlight: true },
            ].map(({ label, value, Icon, colorClass, bg, highlight }, i) => (
              <article key={label} className={`panel stat-card stagger-${i + 1} animate-rise`}>
                <div className="stat-card-body">
                  <p className="stat-card-label">{label}</p>
                  <p className={`stat-card-value stat-number${highlight ? ` ${colorClass}` : ''}`}>{value}</p>
                </div>
                <div className={`stat-card-icon ${bg} ${colorClass} border`} style={{ borderColor: 'var(--surface-border)' }}>
                  <Icon className="h-5 w-5" />
                </div>
              </article>
            ))}
          </section>

          {/* ── Results list ── */}
          <section className="panel p-7 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="label-micro">Submissions</p>
                <h2 className="mt-3 heading-lg">Learner results</h2>
              </div>
              <div className="input-with-icon w-full max-w-md sm:w-[320px]">
                <Search className="input-icon-left h-4 w-4" />
                <input
                  className="input-field"
                  placeholder="Filter by learner name"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="skeleton h-20" />)}
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="empty-state-title">No attempts found</p>
                  <p className="empty-state-body">
                    {search ? 'No learner matches your search.' : 'No learner submissions are available for this assessment yet.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredResults.map(result => {
                    const isExp = expanded === result.result_id
                    const rAnswers = answersByResult[result.result_id] || []
                    const learnerName = users[result.user_id] || 'Learner'
                    return (
                      <article key={result.result_id} className="panel-interactive overflow-hidden">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-4 p-4 text-left"
                          onClick={() => setExpanded(isExp ? null : result.result_id)}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold"
                              style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}
                            >
                              {initials(learnerName)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                                {learnerName}
                              </p>
                              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                {new Date(result.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold font-numeric" style={{ color: 'var(--text-main)' }}>
                              {result.score}%
                            </span>
                            <span className={`badge ${result.status === 'pass' ? 'badge-pass' : 'badge-fail'}`}>
                              {result.status === 'pass'
                                ? <><CheckCircle2 className="h-3 w-3" /> Pass</>
                                : <><XCircle className="h-3 w-3" /> Fail</>}
                            </span>
                          </div>
                        </button>

                        {isExp && rAnswers.length > 0 && (
                          <div className="px-4 pb-4 pt-0">
                            <hr className="divider mb-4" />
                            <div className="space-y-2">
                              {rAnswers.map(a => (
                                <div
                                  key={`${result.result_id}-${a.question_id}`}
                                  className="panel-inset flex items-start gap-3 px-3 py-2.5 text-sm"
                                >
                                  {a.is_correct
                                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--success)' }} />
                                    : <XCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--danger)' }} />}
                                  <div className="min-w-0">
                                    <p className="font-medium" style={{ color: 'var(--text-main)' }}>
                                      {questions[a.question_id] || 'Question'}
                                    </p>
                                    <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                      Answer: {a.selected_answer || 'No answer'}
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
