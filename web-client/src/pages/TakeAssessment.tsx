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

  const OrbBackground = () => (
    <div className="bg-orbs">
      <div className="bg-orb bg-orb-primary bg-orb-tl" />
      <div className="bg-orb bg-orb-secondary bg-orb-tr" />
      <div className="bg-orb bg-orb-tertiary bg-orb-bl" />
    </div>
  )

  if (loading) {
    return (
      <div className="app-page">
        <OrbBackground />
        <div className="relative mx-auto flex min-h-screen w-full max-w-[1100px] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <section className="panel w-full max-w-[720px] p-7">
            <div className="flex items-start gap-4">
              <div className="skeleton h-12 w-12 rounded-2xl" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-6 w-48 rounded" />
                <div className="skeleton h-4 w-64 rounded" />
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (error && !assessment) {
    return (
      <div className="app-page">
        <OrbBackground />
        <div className="relative mx-auto flex min-h-screen w-full max-w-[1100px] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <section className="panel w-full max-w-[720px] p-7">
            <div className="alert alert-error mb-0">
              <AlertCircle className="alert-icon h-5 w-5" />
              <div>
                <p className="label-micro mb-1">Unable to load</p>
                <p className="font-semibold" style={{ color: 'var(--text-main)' }}>Assessment not available</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary mt-5"
              onClick={() => navigate('/learner-dashboard')}
            >
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </button>
          </section>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="app-page">
        <OrbBackground />
        <div className="relative mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6 lg:px-8">
          <section className="panel mx-auto w-full max-w-[860px] p-7 sm:p-8 animate-scale-in">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success-border)' }}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="label-micro">Assessment complete</p>
                  <h1
                    className="mt-2 text-2xl font-bold tracking-tight"
                    style={{ color: 'var(--text-main)', letterSpacing: '-0.025em' }}
                  >
                    {assessment?.title}
                  </h1>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                    Results were calculated and saved automatically.
                  </p>
                </div>
              </div>
              <button type="button" className="btn-secondary" onClick={() => navigate('/learner-dashboard')}>
                <ArrowLeft className="h-4 w-4" /> Back to dashboard
              </button>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Score', value: `${result.score}%`, sub: 'Auto-calculated' },
                { label: 'Questions', value: result.total_questions, sub: 'Total evaluated' },
                {
                  label: 'Status',
                  value: result.status.toUpperCase(),
                  sub: 'Pass threshold: 50%',
                  highlight: result.status,
                },
              ].map(({ label, value, sub, highlight }) => (
                <article key={label} className="panel-inset p-5">
                  <p className="label-micro">{label}</p>
                  <p
                    className="mt-2 stat-number"
                    style={{
                      color: highlight === 'pass'
                        ? 'var(--success)'
                        : highlight === 'fail'
                        ? 'var(--danger)'
                        : 'var(--text-main)',
                    }}
                  >
                    {value}
                  </p>
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="app-page">
      <OrbBackground />

      {/* ── Fixed header bar ── */}
      <div className="fixed left-0 right-0 top-0 z-40 px-4 pt-4 sm:px-6">
        <div className="panel-raised mx-auto max-w-[1100px] px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button type="button" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={() => navigate('/learner-dashboard')}>
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="min-w-0">
                <p className="label-micro">Assessment in progress</p>
                <p className="mt-0.5 truncate text-base font-semibold" style={{ color: 'var(--text-main)' }}>
                  {assessment?.title}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Timer */}
              <div
                className="panel-inset flex items-center gap-2 px-3 py-2 text-xs"
              >
                <Clock3 className="h-4 w-4" style={{ color: secondsLeft < 60 ? 'var(--danger)' : 'var(--text-secondary)' }} />
                <span
                  className={`font-bold font-numeric${secondsLeft < 60 ? ' timer-urgent' : ''}`}
                  style={{
                    color: secondsLeft < 60 ? 'var(--danger)' : 'var(--text-main)',
                    fontWeight: secondsLeft < 30 ? 700 : 600,
                  }}
                >
                  {formattedTime}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>left</span>
              </div>

              {/* Progress bar */}
              <div className="flex min-w-[200px] items-center gap-3">
                <div className="progress-track w-full">
                  <div
                    className={`progress-fill${progressPercent < 100 ? ' progress-bar-shimmer' : ''}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{answeredCount}</span>
                  <span>/{totalQuestions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Question canvas ── */}
      <main className="relative mx-auto w-full max-w-[1100px] px-4 pb-10 pt-32 sm:px-6 lg:px-8">
        <section className="panel p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-micro">Question canvas</p>
              <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                Select one option per question. Progress saves in-session until submission.
              </p>
            </div>
            <span className="badge badge-primary inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Focus Mode
            </span>
          </div>

          {/* Inline error */}
          {error && (
            <div className="alert alert-error mt-5">
              <AlertCircle className="alert-icon h-4 w-4" />
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-5">
            {questions.map((question, index) => {
              const options = normalizeOptions(question.options)
              const selected = answers[question.question_id]
              return (
                <article
                  key={question.question_id}
                  className="panel p-6"
                  style={selected ? { borderLeftWidth: '3px', borderLeftColor: 'var(--primary)' } : {}}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="label-micro">
                        Question {index + 1} of {totalQuestions || questions.length}
                      </p>
                      <h2
                        className="mt-2 text-xl font-semibold leading-snug"
                        style={{ color: 'var(--text-main)', letterSpacing: '-0.015em' }}
                      >
                        {question.question_text}
                      </h2>
                    </div>
                    {selected ? (
                      <span className="badge badge-primary shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Selected
                      </span>
                    ) : (
                      <span className="badge badge-neutral shrink-0">Choose one</span>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3">
                    {options.map((option) => (
                      <label
                        key={option}
                        className={`option-row${answers[question.question_id] === option ? ' selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name={question.question_id}
                          value={option}
                          checked={answers[question.question_id] === option}
                          onChange={e =>
                            setAnswers(current => ({ ...current, [question.question_id]: e.target.value }))
                          }
                          className="sr-only"
                        />
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 mt-0.5"
                          style={{
                            borderColor: answers[question.question_id] === option ? 'var(--primary)' : 'var(--surface-border)',
                            background: answers[question.question_id] === option ? 'var(--primary)' : 'transparent',
                          }}
                        >
                          {answers[question.question_id] === option && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <span className="text-sm leading-6" style={{ color: 'var(--text-main)' }}>{option}</span>
                      </label>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Progress:{' '}
              <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{answeredCount}</span>
              /{totalQuestions}{' '}
              <span style={{ color: 'var(--text-muted)' }}>({progressPercent}%)</span>
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '13px 28px' }}
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit assessment'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
