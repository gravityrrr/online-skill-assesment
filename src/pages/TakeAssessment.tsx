import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AssessmentRow {
  assessment_id: string
  title: string
  time_limit: number
}

interface QuestionRow {
  question_id: string
  question_text: string
  question_order: number
  options: unknown
}

interface SubmitResult {
  score: number
  total_questions: number
  status: 'pass' | 'fail'
}

function normalizeOptions(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options
      .map((item) => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item && 'label' in item) {
          return String((item as { label: string }).label)
        }
        return String(item)
      })
      .filter(Boolean)
  }
  return []
}

export default function TakeAssessment() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [assessment, setAssessment] = useState<AssessmentRow | null>(null)
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [result, setResult] = useState<SubmitResult | null>(null)

  useEffect(() => {
    void loadAssessment()
  }, [assessmentId])

  useEffect(() => {
    if (secondsLeft <= 0 || loading || submitting || result) return
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          void handleSubmit()
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [loading, result, secondsLeft, submitting])

  const loadAssessment = async () => {
    if (!assessmentId) return
    setLoading(true)
    setError('')

    const [{ data: assessmentRow, error: assessmentError }, { data: questionRows, error: questionError }] = await Promise.all([
      supabase.from('assessments').select('assessment_id, title, time_limit').eq('assessment_id', assessmentId).single(),
      supabase.from('questions').select('question_id, question_text, question_order, options').eq('assessment_id', assessmentId).order('question_order', { ascending: true }),
    ])

    if (assessmentError || !assessmentRow) {
      setError(assessmentError?.message || 'Assessment not found.')
      setLoading(false)
      return
    }
    if (questionError) {
      setError(questionError.message)
      setLoading(false)
      return
    }

    setAssessment(assessmentRow as AssessmentRow)
    setQuestions((questionRows as QuestionRow[]) ?? [])
    setSecondsLeft(Number((assessmentRow as AssessmentRow).time_limit) * 60)
    setLoading(false)
  }

  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60)
    const secs = secondsLeft % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [secondsLeft])

  const totalQuestions = questions.length
  const answeredCount = useMemo(() => {
    if (questions.length === 0) return 0
    return questions.reduce((count, q) => (answers[q.question_id] ? count + 1 : count), 0)
  }, [answers, questions])

  const progressPercent = useMemo(() => {
    if (totalQuestions === 0) return 0
    return Math.round((answeredCount / totalQuestions) * 100)
  }, [answeredCount, totalQuestions])

  const handleSubmit = async () => {
    if (!assessmentId || submitting || result) return
    setSubmitting(true)
    setError('')

    const { data, error: submitError } = await supabase.rpc('submit_assessment', {
      target_assessment_id: assessmentId,
      answers,
    })

    if (submitError) {
      setError(submitError.message)
      setSubmitting(false)
      return
    }

    const payload = Array.isArray(data) ? data[0] : data
    if (payload) setResult(payload as SubmitResult)
    setSubmitting(false)
  }

  const DynamicBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0b0c0f]">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-sky-600/10 blur-[120px]" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen text-slate-200 flex items-center justify-center relative">
        <DynamicBackground />
        <section className="relative z-10 w-full max-w-[720px] rounded-[2.5rem] border border-white/5 bg-[#101218]/80 p-10 backdrop-blur-xl shadow-2xl">
          <div className="flex items-start gap-6">
            <div className="h-16 w-16 rounded-2xl bg-white/5 animate-pulse" />
            <div className="flex-1 space-y-4 pt-2">
              <div className="h-4 w-32 rounded-lg bg-white/5 animate-pulse" />
              <div className="h-8 w-64 rounded-lg bg-white/5 animate-pulse" />
              <div className="h-4 w-48 rounded-lg bg-white/5 animate-pulse" />
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (error && !assessment) {
    return (
      <div className="min-h-screen text-slate-200 flex items-center justify-center relative">
        <DynamicBackground />
        <section className="relative z-10 w-full max-w-[720px] rounded-[2.5rem] border border-white/5 bg-[#101218]/80 p-10 backdrop-blur-xl shadow-2xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-6 shadow-[0_0_40px_rgba(244,63,94,0.15)]">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Assessment Unavailable</h2>
          <p className="mt-4 text-rose-300 max-w-md mx-auto text-sm">{error}</p>
          <button
            type="button"
            className="mt-8 flex mx-auto items-center gap-2 rounded-full bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
            onClick={() => navigate('/learner-dashboard')}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
        </section>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen text-slate-200 p-6 sm:p-10 relative">
        <DynamicBackground />
        <div className="relative z-10 mx-auto w-full max-w-[900px]">
          <section className="rounded-[3rem] border border-white/5 bg-[#101218]/80 p-10 sm:p-14 backdrop-blur-xl shadow-2xl animate-rise text-center overflow-hidden">
            <div className={`absolute -top-40 -right-40 h-[400px] w-[400px] rounded-full blur-[100px] pointer-events-none ${result.status === 'pass' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`} />
            
            <div className="relative z-10">
              <div
                className={`mx-auto flex h-24 w-24 items-center justify-center rounded-[2.5rem] border shadow-2xl ${
                  result.status === 'pass'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.2)]'
                }`}
              >
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <p className="mt-8 bg-gradient-to-r from-slate-300 to-slate-500 bg-clip-text text-[10px] font-black uppercase tracking-[0.25em] text-transparent">
                Assessment Complete
              </p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-white px-4">
                {assessment?.title}
              </h1>
              <p className="mt-4 text-sm text-slate-400 max-w-lg mx-auto">
                Results have been automatically calculated and persisted to your history.
              </p>

              <div className="mt-12 grid gap-4 grid-cols-3 max-w-[700px] mx-auto">
                <article className="rounded-3xl bg-white/[0.02] border border-white/5 p-6 backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Score</p>
                  <p className={`mt-3 text-4xl sm:text-5xl font-black ${result.status === 'pass' ? 'text-emerald-400' : 'text-rose-400'}`}>{result.score}%</p>
                  <p className="mt-2 text-xs text-slate-400">Auto-calculated</p>
                </article>
                <article className="rounded-3xl bg-white/[0.02] border border-white/5 p-6 backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Questions</p>
                  <p className="mt-3 text-4xl sm:text-5xl font-black text-white">{result.total_questions}</p>
                  <p className="mt-2 text-xs text-slate-400">Total Evaluated</p>
                </article>
                <article className="rounded-3xl bg-white/[0.02] border border-white/5 p-6 backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</p>
                  <p className={`mt-3 text-2xl sm:text-3xl font-black ${result.status === 'pass' ? 'text-emerald-400' : 'text-rose-400'}`}>{result.status.toUpperCase()}</p>
                  <p className="mt-4 text-xs text-slate-400">Pass threshold: 50%</p>
                </article>
              </div>

              <div className="mt-12">
                <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-1 hover:bg-white/10 shadow-lg" onClick={() => navigate('/learner-dashboard')}>
                  <ArrowLeft className="h-4 w-4" /> Return to Dashboard
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-200">
      <DynamicBackground />

      {/* ── Fixed Header Bar ── */}
      <div className="fixed left-0 right-0 top-0 z-40 px-4 sm:px-6 pt-6">
        <div className="mx-auto max-w-[1200px]">
          <div className="rounded-[2rem] border border-white/10 bg-[#0b0c0f]/80 p-4 backdrop-blur-xl shadow-2xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6">
            <div className="flex min-w-0 items-center gap-4">
              <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/5 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white" onClick={() => navigate('/learner-dashboard')}>
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 border-l border-white/10 pl-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">In Progress</p>
                <p className="truncate text-sm font-bold text-white tracking-tight sm:max-w-[300px]">
                  {assessment?.title}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Timer */}
              <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2 ${secondsLeft < 60 ? 'border-rose-500/30 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)] animate-pulse' : 'border-white/5 bg-black/40'}`}>
                <Clock3 className={`h-4 w-4 ${secondsLeft < 60 ? 'text-rose-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-bold tracking-wider ${secondsLeft < 60 ? 'text-rose-400' : 'text-white'}`}>
                  {formattedTime}
                </span>
              </div>

              {/* Progress Tracker */}
              <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-black/40 px-4 py-2">
                <div className="flex flex-col gap-1 w-[120px] sm:w-[150px]">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-sky-300">{answeredCount}/{totalQuestions}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                className="neon-btn !py-2 !px-6 !rounded-2xl !text-sm whitespace-nowrap"
                onClick={() => void handleSubmit()}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Question Canvas ── */}
      <main className="relative z-10 mx-auto w-full max-w-[900px] px-4 pb-20 pt-48 sm:px-6">
        <section className="rounded-[3rem] border border-white/5 bg-[#101218]/60 p-8 sm:p-12 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-8">
            <div>
              <p className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.2em] text-transparent">
                Assessment Canvas
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
              <Sparkles className="h-3 w-3" /> Focus Mode Active
            </span>
          </div>

          {error && (
            <div className="mb-8 flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-200 backdrop-blur-md">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              {error}
            </div>
          )}

          <div className="grid gap-8">
            {questions.map((question, index) => {
              const options = normalizeOptions(question.options)
              const selected = answers[question.question_id]
              return (
                <article
                  key={question.question_id}
                  className={`group relative overflow-hidden rounded-[2rem] border transition-all duration-300 ${
                    selected ? 'border-sky-500/30 bg-sky-500/5 shadow-[0_0_30px_rgba(56,189,248,0.05)]' : 'border-white/5 bg-black/40 hover:bg-slate-900/60'
                  } p-8 backdrop-blur-md`}
                >
                  {selected && <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-sky-400 to-indigo-500" />}
                  
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        Question {index + 1}
                      </p>
                      <h2 className="mt-3 text-xl font-bold leading-relaxed text-white tracking-tight">
                        {question.question_text}
                      </h2>
                    </div>
                    {selected ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                        <CheckCircle2 className="h-3 w-3" /> Selected
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="mt-8 grid gap-4">
                    {options.map((option) => {
                      const isSelected = answers[question.question_id] === option
                      return (
                        <label
                          key={option}
                          className={`relative flex cursor-pointer items-start gap-4 rounded-2xl border p-5 transition-all duration-300 ${
                            isSelected
                              ? 'border-sky-500 bg-sky-500/10 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                              : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          <input
                            type="radio"
                            name={question.question_id}
                            value={option}
                            checked={isSelected}
                            onChange={e =>
                              setAnswers(current => ({ ...current, [question.question_id]: e.target.value }))
                            }
                            className="sr-only"
                          />
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            isSelected ? 'border-sky-400 bg-sky-400' : 'border-slate-500 bg-transparent'
                          }`}>
                            {isSelected && <span className="h-2 w-2 rounded-full bg-black/80" />}
                          </div>
                          <span className={`text-sm leading-relaxed font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {option}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-t border-white/5 pt-8">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Final Step</span>
              <span className="text-sm font-medium text-slate-300">Ensure all questions are answered before completing.</span>
            </div>
            <button
              type="button"
              className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-10 py-4 font-bold text-white shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
              {submitting ? 'Processing...' : 'Submit Assessment'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
