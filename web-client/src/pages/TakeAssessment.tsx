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

  const surfaceClass =
    'rounded-3xl border border-white/5 bg-slate-800/30 shadow-[0_20px_70px_rgba(2,6,23,0.65)] backdrop-blur-xl'
  const cardClass =
    'rounded-3xl border border-white/5 bg-slate-800/30 shadow-[0_20px_70px_rgba(2,6,23,0.65)] backdrop-blur-xl'
  const primaryGlowButtonClass =
    'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_50px_rgba(99,102,241,0.25)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_28px_70px_rgba(34,211,238,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-60'
  const subtleButtonClass =
    'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all duration-300 ease-out hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'

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
    if (payload) {
      setResult(payload as SubmitResult)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950" />
          <div className="absolute left-[-140px] top-[-160px] h-80 w-80 rounded-full bg-indigo-500/16 blur-3xl" />
          <div className="absolute right-[-150px] top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-[-160px] left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-[1100px] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <section className={`${cardClass} w-full max-w-[720px] p-7`}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Focus mode</p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">Loading assessment…</h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">Preparing questions and syncing your session.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (error && !assessment) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950" />
          <div className="absolute left-[-140px] top-[-160px] h-80 w-80 rounded-full bg-indigo-500/16 blur-3xl" />
          <div className="absolute right-[-150px] top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-[-160px] left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-[1100px] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <section className={`${cardClass} w-full max-w-[720px] p-7`}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-100">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Unable to load</p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">Assessment not available</h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">{error}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" className={subtleButtonClass} onClick={() => navigate('/learner-dashboard')}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to dashboard
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950" />
          <div className="absolute left-[-140px] top-[-160px] h-80 w-80 rounded-full bg-indigo-500/16 blur-3xl" />
          <div className="absolute right-[-150px] top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-[-160px] left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6 lg:px-8">
          <section className={`${cardClass} mx-auto w-full max-w-[860px] p-7 sm:p-8`}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Assessment complete</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{assessment?.title}</h1>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Results were calculated and saved automatically.</p>
                </div>
              </div>

              <button type="button" className={subtleButtonClass} onClick={() => navigate('/learner-dashboard')}>
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </button>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <article className={`${surfaceClass} p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Score</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{result.score}%</p>
                <p className="mt-2 text-sm text-slate-400">Auto-calculated</p>
              </article>
              <article className={`${surfaceClass} p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Questions</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{result.total_questions}</p>
                <p className="mt-2 text-sm text-slate-400">Total evaluated</p>
              </article>
              <article className={`${surfaceClass} p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Status</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{result.status.toUpperCase()}</p>
                <p className="mt-2 text-sm text-slate-400">Pass threshold: 50%</p>
              </article>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950" />
        <div className="absolute left-[-140px] top-[-160px] h-80 w-80 rounded-full bg-indigo-500/16 blur-3xl" />
        <div className="absolute right-[-150px] top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-160px] left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="fixed left-0 right-0 top-0 z-40 px-4 pt-4 sm:px-6">
        <div className={`${surfaceClass} mx-auto max-w-[1100px] px-4 py-3 sm:px-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button type="button" className={subtleButtonClass} onClick={() => navigate('/learner-dashboard')}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Assessment in progress</p>
                <p className="mt-1 truncate text-base font-semibold tracking-tight text-white">{assessment?.title}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                <Clock3 className="h-4 w-4 text-slate-300" />
                <span className="font-semibold text-slate-100">{formattedTime}</span>
                <span className="text-slate-400">left</span>
              </div>

              <div className="flex min-w-[200px] items-center gap-3">
                <div className="w-full">
                  <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.03]">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-slate-100">{answeredCount}</span>
                  <span className="text-slate-400">/{totalQuestions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="relative mx-auto w-full max-w-[1100px] px-4 pb-10 pt-28 sm:px-6 lg:px-8">
        <section className={`${surfaceClass} p-6 sm:p-7`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Question canvas</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Select one option per question. Your progress saves in-session until submission.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              <Sparkles className="h-4 w-4 text-indigo-200" />
              Focus Mode
            </div>
          </div>

          {error ? (
            <div className="mt-5 flex items-start gap-3 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-200" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-6 grid gap-5">
            {questions.map((question, index) => {
              const options = normalizeOptions(question.options)
              const selected = answers[question.question_id]
              return (
                <article
                  key={question.question_id}
                  className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/10 hover:shadow-2xl hover:shadow-indigo-500/10"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Question {index + 1} of {totalQuestions || questions.length}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl">
                        {question.question_text}
                      </h2>
                    </div>
                    {selected ? (
                      <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-indigo-300/20 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-100">
                        <CheckCircle2 className="h-4 w-4" />
                        Selected
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                        Choose one
                      </span>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3">
                    {options.map((option) => {
                      const isSelected = answers[question.question_id] === option
                      return (
                        <label
                          key={option}
                          className={[
                            'group flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 ease-out',
                            'bg-slate-900/40 backdrop-blur-xl',
                            isSelected
                              ? 'border-indigo-400/30 bg-indigo-500/10 ring-2 ring-indigo-500/40'
                              : 'border-white/10 hover:border-white/20 hover:bg-white/[0.06]',
                          ].join(' ')}
                        >
                          <input
                            type="radio"
                            name={question.question_id}
                            value={option}
                            checked={answers[question.question_id] === option}
                            onChange={(event) =>
                              setAnswers((current) => ({
                                ...current,
                                [question.question_id]: event.target.value,
                              }))
                            }
                            className="mt-1 h-4 w-4 accent-indigo-400"
                          />
                          <span className={`text-sm leading-6 ${isSelected ? 'text-slate-100' : 'text-slate-200'}`}>{option}</span>
                        </label>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-400">
              Progress: <span className="font-semibold text-slate-100">{answeredCount}</span>/{totalQuestions}{' '}
              <span className="text-slate-500">({progressPercent}%)</span>
            </div>
            <button type="button" className={primaryGlowButtonClass} onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit assessment'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
