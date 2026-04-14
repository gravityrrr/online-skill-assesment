import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Award, CheckCircle2, Clock3, History, RefreshCcw, Target, TrendingUp, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const surface = 'rounded-3xl border border-white/10 bg-slate-900/75 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl'
const btnSecondary = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10'

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
    { label: 'Total attempts', value: results.length, sub: 'Across this assessment', Icon: History, color: 'text-sky-300', bg: 'bg-sky-500/10' },
    { label: 'Best score', value: `${bestScore}%`, sub: 'Highest attempt', Icon: Award, color: 'text-emerald-300', bg: 'bg-emerald-500/10' },
    { label: 'Average score', value: `${average}%`, sub: 'Overall trend', Icon: TrendingUp, color: 'text-indigo-300', bg: 'bg-indigo-500/10' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-indigo-500/12 blur-3xl" />
        <div className="absolute right-[-100px] bottom-[-80px] h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          <header className={`${surface} px-5 py-5 sm:px-6`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Learner portal</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">All your attempts for this assessment.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" className={btnSecondary} onClick={() => void fetchHistory()}>
                  <RefreshCcw className="h-4 w-4" /> Refresh
                </button>
                <button type="button" className={btnSecondary} onClick={() => navigate('/learner-dashboard')}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              </div>
            </div>
          </header>

          {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div>}

          <section className="grid gap-4 sm:grid-cols-3">
            {metrics.map(({ label, value, sub, Icon, color, bg }) => (
              <article key={label} className={`${surface} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="mt-2 text-4xl font-semibold text-white">{value}</p>
                    <p className="mt-2 text-xs text-slate-500">{sub}</p>
                  </div>
                  <div className={`rounded-2xl ${bg} p-3 ${color}`}><Icon className="h-5 w-5" /></div>
                </div>
              </article>
            ))}
          </section>

          <section className={`${surface} p-6`}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Attempt log</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Your submissions</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                <Clock3 className="h-4 w-4" /> Newest first
              </div>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-900/70" />)}</div>
              ) : results.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                  <h3 className="text-lg font-semibold text-white">No attempts yet</h3>
                  <p className="mt-2 text-sm text-slate-400">Take this assessment to generate your first result.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map(result => {
                    const isExpanded = expanded === result.result_id
                    const resultAnswers = answersByResult[result.result_id] || []
                    return (
                      <article key={result.result_id} className="rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/15">
                        <button type="button" className="flex w-full items-center justify-between gap-4 p-4 text-left" onClick={() => setExpanded(isExpanded ? null : result.result_id)}>
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl font-semibold text-white">
                              {result.score}%
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                {result.status === 'pass' ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200"><CheckCircle2 className="h-3 w-3" /> PASS</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-lg border border-rose-300/20 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-200"><XCircle className="h-3 w-3" /> FAIL</span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{new Date(result.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-500">{isExpanded ? 'Hide' : 'Show'} details</span>
                        </button>
                        {isExpanded && resultAnswers.length > 0 && (
                          <div className="border-t border-white/5 px-4 pb-4 pt-3">
                            <div className="space-y-2">
                              {resultAnswers.map(answer => (
                                <div key={`${result.result_id}-${answer.question_id}`} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-sm">
                                  {answer.is_correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />}
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-200">{questions[answer.question_id] || 'Question'}</p>
                                    <p className="mt-1 text-xs text-slate-400">Answer: {answer.selected_answer || 'No answer'}</p>
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
