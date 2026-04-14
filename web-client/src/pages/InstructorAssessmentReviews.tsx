import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, RefreshCcw, Search, ShieldCheck, Users, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const surface = 'rounded-3xl border border-white/10 bg-slate-900/75 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl'
const btnSecondary = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10'

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
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-indigo-500/12 blur-3xl" />
        <div className="absolute right-[-100px] top-28 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6">
          <header className={`${surface} px-5 py-5 sm:px-6`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Instructor portal</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Review learner attempts and answer-level detail.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" className={btnSecondary} onClick={() => void fetchReviews()}><RefreshCcw className="h-4 w-4" /> Refresh</button>
                <button type="button" className={btnSecondary} onClick={() => navigate('/instructor-dashboard')}><ArrowLeft className="h-4 w-4" /> Back</button>
              </div>
            </div>
          </header>

          {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div>}

          <section className="grid gap-4 sm:grid-cols-3">
            <article className={`${surface} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm text-slate-400">Total submissions</p><p className="mt-2 text-4xl font-semibold text-white">{results.length}</p></div>
                <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-300"><Users className="h-5 w-5" /></div>
              </div>
            </article>
            <article className={`${surface} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm text-slate-400">Average score</p><p className="mt-2 text-4xl font-semibold text-white">{avgScore}%</p></div>
                <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300"><CheckCircle2 className="h-5 w-5" /></div>
              </div>
            </article>
            <article className={`${surface} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm text-slate-400">Pass rate</p><p className="mt-2 text-4xl font-semibold text-emerald-300">{passRate}%</p></div>
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300"><CheckCircle2 className="h-5 w-5" /></div>
              </div>
            </article>
          </section>

          <section className={`${surface} p-6`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Submissions</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Learner results</h2>
              </div>
              <label className="relative w-full max-w-md sm:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300/50 focus:outline-none" placeholder="Filter by learner name" value={search} onChange={e => setSearch(e.target.value)} />
              </label>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-900/70" />)}</div>
              ) : filteredResults.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                  <h3 className="text-lg font-semibold text-white">No attempts found</h3>
                  <p className="mt-2 text-sm text-slate-400">No learner submissions are available for this assessment yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredResults.map(result => {
                    const isExp = expanded === result.result_id
                    const rAnswers = answersByResult[result.result_id] || []
                    const learnerName = users[result.user_id] || 'Learner'
                    return (
                      <article key={result.result_id} className="rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/15">
                        <button type="button" className="flex w-full items-center justify-between gap-4 p-4 text-left" onClick={() => setExpanded(isExp ? null : result.result_id)}>
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-sm font-semibold text-indigo-200">
                              {initials(learnerName)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{learnerName}</p>
                              <p className="mt-1 text-xs text-slate-500">{new Date(result.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-white">{result.score}%</span>
                            {result.status === 'pass' ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200"><CheckCircle2 className="h-3 w-3" /> PASS</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-rose-300/20 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-200"><XCircle className="h-3 w-3" /> FAIL</span>
                            )}
                          </div>
                        </button>
                        {isExp && rAnswers.length > 0 && (
                          <div className="border-t border-white/5 px-4 pb-4 pt-3">
                            <div className="space-y-2">
                              {rAnswers.map(a => (
                                <div key={`${result.result_id}-${a.question_id}`} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-sm">
                                  {a.is_correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />}
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-200">{questions[a.question_id] || 'Question'}</p>
                                    <p className="mt-1 text-xs text-slate-400">Answer: {a.selected_answer || 'No answer'}</p>
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
