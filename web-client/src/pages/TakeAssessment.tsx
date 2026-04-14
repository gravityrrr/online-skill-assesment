import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
      <div className="shell">
        <section className="panel card" style={{ maxWidth: 720 }}>
          <p className="subtitle">Loading assessment...</p>
        </section>
      </div>
    )
  }

  if (error && !assessment) {
    return (
      <div className="shell">
        <section className="panel card" style={{ maxWidth: 720 }}>
          <div className="auth-error">{error}</div>
          <button type="button" className="secondary-btn" onClick={() => navigate('/learner-dashboard')}>Back to dashboard</button>
        </section>
      </div>
    )
  }

  if (result) {
    return (
      <div className="shell">
        <section className="panel card" style={{ maxWidth: 760 }}>
          <p className="eyebrow">Assessment complete</p>
          <h1 className="title" style={{ marginTop: 8 }}>{assessment?.title}</h1>
          <div className="metric-grid" style={{ marginTop: 20 }}>
            <article className="metric-card">
              <p>Score</p>
              <h2>{result.score}%</h2>
              <span>Auto-calculated</span>
            </article>
            <article className="metric-card">
              <p>Questions</p>
              <h2>{result.total_questions}</h2>
              <span>Total evaluated</span>
            </article>
            <article className="metric-card">
              <p>Status</p>
              <h2>{result.status.toUpperCase()}</h2>
              <span>Pass threshold: 50%</span>
            </article>
          </div>
          <button type="button" className="primary-btn" style={{ marginTop: 20 }} onClick={() => navigate('/learner-dashboard')}>
            Back to learner dashboard
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="shell" style={{ justifyContent: 'flex-start', paddingTop: 52 }}>
      <section className="panel card" style={{ width: 'min(960px, 100%)' }}>
        <div className="admin-header">
          <div>
            <p className="eyebrow">Assessment in progress</p>
            <h1 className="title" style={{ marginTop: 8 }}>{assessment?.title}</h1>
            <p className="subtitle" style={{ marginTop: 10 }}>Answer all questions and submit before time runs out.</p>
          </div>
          <article className="metric-card" style={{ minWidth: 120 }}>
            <p>Time left</p>
            <h2>{formattedTime}</h2>
          </article>
        </div>

        {error && <div className="auth-error" style={{ marginTop: 16 }}>{error}</div>}

        <div className="list-grid" style={{ marginTop: 18 }}>
          {questions.map((question, index) => {
            const options = normalizeOptions(question.options)
            return (
              <article className="dashboard-item" key={question.question_id}>
                <h2>{index + 1}. {question.question_text}</h2>
                <div className="field-stack" style={{ marginTop: 10 }}>
                  {options.map((option) => (
                    <label key={option} className="option-row">
                      <input
                        type="radio"
                        name={question.question_id}
                        value={option}
                        checked={answers[question.question_id] === option}
                        onChange={(event) => setAnswers((current) => ({ ...current, [question.question_id]: event.target.value }))}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </article>
            )
          })}
        </div>

        <button type="button" className="primary-btn" style={{ marginTop: 20 }} onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit assessment'}
        </button>
      </section>
    </div>
  )
}
