import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface AssessmentMeta {
  title: string
}

interface ResultRow {
  result_id: string
  user_id: string
  score: number
  status: 'pass' | 'fail'
  created_at: string
}

interface UserRow {
  id: string
  name: string
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

  useEffect(() => {
    void fetchReviews()
  }, [assessmentId])

  const fetchReviews = async () => {
    if (!assessmentId) return
    setLoading(true)
    setError('')

    const [{ data: assessmentMeta }, { data: resultRows, error: resultError }, { data: questionRows }] = await Promise.all([
      supabase.from('assessments').select('title').eq('assessment_id', assessmentId).single(),
      supabase.from('results').select('result_id, user_id, score, status, created_at').eq('assessment_id', assessmentId).order('created_at', { ascending: false }),
      supabase.from('questions').select('question_id, question_text').eq('assessment_id', assessmentId),
    ])

    if (assessmentMeta) setTitle((assessmentMeta as AssessmentMeta).title)

    if (resultError) {
      setError(resultError.message)
      setLoading(false)
      return
    }

    const nextResults = (resultRows as ResultRow[]) ?? []
    setResults(nextResults)

    const questionMap: Record<string, string> = {}
    ;((questionRows as QuestionRow[]) ?? []).forEach((question) => {
      questionMap[question.question_id] = question.question_text
    })
    setQuestions(questionMap)

    if (nextResults.length === 0) {
      setUsers({})
      setAnswers([])
      setLoading(false)
      return
    }

    const learnerIds = [...new Set(nextResults.map((result) => result.user_id))]
    const resultIds = nextResults.map((result) => result.result_id)

    const [{ data: userRows }, { data: answerRows }] = await Promise.all([
      supabase.from('users').select('id, name').in('id', learnerIds),
      supabase.from('result_answers').select('result_id, question_id, selected_answer, is_correct').in('result_id', resultIds),
    ])

    const userMap: Record<string, string> = {}
    ;((userRows as UserRow[]) ?? []).forEach((user) => {
      userMap[user.id] = user.name
    })
    setUsers(userMap)
    setAnswers((answerRows as AnswerRow[]) ?? [])
    setLoading(false)
  }

  const filteredResults = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return results
    return results.filter((result) => {
      const name = users[result.user_id] || 'Learner'
      return name.toLowerCase().includes(term)
    })
  }, [results, search, users])

  const answersByResult = useMemo(() => {
    const map: Record<string, AnswerRow[]> = {}
    answers.forEach((answer) => {
      if (!map[answer.result_id]) map[answer.result_id] = []
      map[answer.result_id].push(answer)
    })
    return map
  }, [answers])

  return (
    <div className="shell" style={{ justifyContent: 'flex-start', paddingTop: 52 }}>
      <section className="panel card" style={{ width: 'min(1020px, 100%)' }}>
        <div className="admin-header">
          <div>
            <p className="eyebrow">Instructor portal</p>
            <h1 className="title" style={{ marginTop: 8 }}>{title}</h1>
            <p className="subtitle" style={{ marginTop: 10 }}>Review learner attempts and answer-level detail.</p>
          </div>
          <div className="admin-actions">
            <button type="button" className="secondary-btn" onClick={() => void fetchReviews()}>Refresh</button>
            <button type="button" className="text-btn" onClick={() => navigate('/instructor-dashboard')}>Back</button>
          </div>
        </div>

        {error && <div className="auth-error" style={{ marginTop: 14 }}>{error}</div>}

        <input className="input-premium" style={{ marginTop: 14 }} placeholder="Filter by learner name" value={search} onChange={(e) => setSearch(e.target.value)} />

        {loading ? (
          <p className="subtitle" style={{ marginTop: 14 }}>Loading attempts...</p>
        ) : filteredResults.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 14 }}>
            <h2>No attempts found</h2>
            <p>No learner submissions are available for this assessment yet.</p>
          </div>
        ) : (
          <div className="list-grid" style={{ marginTop: 14 }}>
            {filteredResults.map((result) => (
              <article key={result.result_id} className="dashboard-item">
                <h2>{users[result.user_id] || 'Learner'} - {result.score}%</h2>
                <p>Status: {result.status.toUpperCase()}</p>
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
