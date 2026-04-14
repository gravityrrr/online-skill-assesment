import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface ResultRow {
  result_id: string
  score: number
  status: 'pass' | 'fail'
  created_at: string
}

interface AnswerRow {
  result_id: string
  question_id: string
  selected_answer: string
  is_correct: boolean
}

interface QuestionRow {
  question_id: string
  question_text: string
}

export default function LearnerAssessmentHistory() {
  const navigate = useNavigate()
  const { assessmentId } = useParams()
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('Assessment history')
  const [results, setResults] = useState<ResultRow[]>([])
  const [answers, setAnswers] = useState<AnswerRow[]>([])
  const [questions, setQuestions] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchHistory()
  }, [assessmentId])

  const fetchHistory = async () => {
    if (!assessmentId) return
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('You need to sign in again.')
      setLoading(false)
      return
    }

    const [{ data: assessment }, { data: resultRows, error: resultsError }, { data: questionRows }] = await Promise.all([
      supabase.from('assessments').select('title').eq('assessment_id', assessmentId).single(),
      supabase
        .from('results')
        .select('result_id, score, status, created_at')
        .eq('assessment_id', assessmentId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('questions').select('question_id, question_text').eq('assessment_id', assessmentId),
    ])

    if (assessment?.title) {
      setTitle(assessment.title)
    }

    if (resultsError) {
      setError(resultsError.message)
      setLoading(false)
      return
    }

    const nextResults = (resultRows as ResultRow[]) ?? []
    setResults(nextResults)

    const qMap: Record<string, string> = {}
    ;((questionRows as QuestionRow[]) ?? []).forEach((row) => {
      qMap[row.question_id] = row.question_text
    })
    setQuestions(qMap)

    if (nextResults.length > 0) {
      const ids = nextResults.map((row) => row.result_id)
      const { data: answerRows } = await supabase
        .from('result_answers')
        .select('result_id, question_id, selected_answer, is_correct')
        .in('result_id', ids)
      setAnswers((answerRows as AnswerRow[]) ?? [])
    } else {
      setAnswers([])
    }

    setLoading(false)
  }

  const average = useMemo(() => {
    if (results.length === 0) return 0
    return Math.round(results.reduce((sum, row) => sum + Number(row.score || 0), 0) / results.length)
  }, [results])

  const answersByResult = useMemo(() => {
    const map: Record<string, AnswerRow[]> = {}
    answers.forEach((entry) => {
      if (!map[entry.result_id]) map[entry.result_id] = []
      map[entry.result_id].push(entry)
    })
    return map
  }, [answers])

  return (
    <div className="shell" style={{ justifyContent: 'flex-start', paddingTop: 52 }}>
      <section className="panel card" style={{ width: 'min(980px, 100%)' }}>
        <div className="admin-header">
          <div>
            <p className="eyebrow">Learner portal</p>
            <h1 className="title" style={{ marginTop: 8 }}>{title}</h1>
            <p className="subtitle" style={{ marginTop: 10 }}>All your attempts for this assessment.</p>
          </div>
          <div className="admin-actions">
            <button type="button" className="secondary-btn" onClick={() => void fetchHistory()}>Refresh</button>
            <button type="button" className="text-btn" onClick={() => navigate('/learner-dashboard')}>Back</button>
          </div>
        </div>

        {error && <div className="auth-error" style={{ marginTop: 14 }}>{error}</div>}

        <div className="metric-grid" style={{ marginTop: 18 }}>
          <article className="metric-card">
            <p>Total attempts</p>
            <h2>{results.length}</h2>
            <span>Across this assessment</span>
          </article>
          <article className="metric-card">
            <p>Best score</p>
            <h2>{results.length > 0 ? Math.max(...results.map((row) => Number(row.score || 0))) : 0}%</h2>
            <span>Highest attempt</span>
          </article>
          <article className="metric-card">
            <p>Average score</p>
            <h2>{average}%</h2>
            <span>Overall trend</span>
          </article>
        </div>

        {loading ? (
          <p className="subtitle" style={{ marginTop: 14 }}>Loading attempt history...</p>
        ) : results.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 14 }}>
            <h2>No attempts yet</h2>
            <p>Take this assessment to generate your first result.</p>
          </div>
        ) : (
          <div className="list-grid" style={{ marginTop: 14 }}>
            {results.map((result) => (
              <article key={result.result_id} className="dashboard-item">
                <h2>{result.score}% ({result.status.toUpperCase()})</h2>
                <p>{new Date(result.created_at).toLocaleString()}</p>
                <div className="field-stack" style={{ marginTop: 10 }}>
                  {(answersByResult[result.result_id] || []).map((answer) => (
                    <div className="option-row" key={`${result.result_id}-${answer.question_id}`}>
                      <span>
                        <strong>{questions[answer.question_id] || 'Question'}:</strong> {answer.selected_answer || 'No answer'}
                      </span>
                      <span>{answer.is_correct ? 'Correct' : 'Incorrect'}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
