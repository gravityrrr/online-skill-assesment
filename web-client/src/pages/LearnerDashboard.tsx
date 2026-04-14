import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface AssessmentRow {
  assessment_id: string
  course_id: string
  title: string
  time_limit: number
  created_at: string
}

interface CourseRow {
  course_id: string
  title: string
}

interface ResultRow {
  result_id: string
  assessment_id: string
  score: number
  status: 'pass' | 'fail'
  created_at: string
}

interface AssessmentProgress {
  attempts: number
  bestScore: number
  latestStatus: 'pass' | 'fail' | 'none'
}

export default function LearnerDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState<AssessmentRow[]>([])
  const [courses, setCourses] = useState<Record<string, string>>({})
  const [results, setResults] = useState<ResultRow[]>([])
  const [assessmentSearch, setAssessmentSearch] = useState('')
  const [assessmentPage, setAssessmentPage] = useState(1)
  const [resultsPage, setResultsPage] = useState(1)

  const pageSize = 6

  useEffect(() => {
    void fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const [{ data: assessmentRows }, { data: courseRows }] = await Promise.all([
      supabase.from('assessments').select('assessment_id, course_id, title, time_limit, created_at').order('created_at', { ascending: false }),
      supabase.from('courses').select('course_id, title'),
    ])

    let resultRows: ResultRow[] = []
    if (user) {
      const { data } = await supabase
        .from('results')
        .select('result_id, assessment_id, score, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      resultRows = (data as ResultRow[]) ?? []
    }

    setAssessments((assessmentRows as AssessmentRow[]) ?? [])
    setResults(resultRows)

    const nextCourses: Record<string, string> = {}
    ;((courseRows as CourseRow[]) ?? []).forEach((course) => {
      nextCourses[course.course_id] = course.title
    })
    setCourses(nextCourses)
    setLoading(false)
  }

  const averageScore = useMemo(() => {
    if (results.length === 0) return 0
    return Math.round(results.reduce((sum, row) => sum + Number(row.score || 0), 0) / results.length)
  }, [results])

  const recentResults = useMemo(() => results.slice(0, 8), [results])

  const progressByAssessment = useMemo(() => {
    const map: Record<string, AssessmentProgress> = {}
    results.forEach((result) => {
      const existing = map[result.assessment_id]
      if (!existing) {
        map[result.assessment_id] = {
          attempts: 1,
          bestScore: Number(result.score || 0),
          latestStatus: result.status,
        }
        return
      }

      map[result.assessment_id] = {
        attempts: existing.attempts + 1,
        bestScore: Math.max(existing.bestScore, Number(result.score || 0)),
        latestStatus: existing.latestStatus,
      }
    })
    return map
  }, [results])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const filteredAssessments = useMemo(() => {
    const term = assessmentSearch.trim().toLowerCase()
    if (!term) return assessments
    return assessments.filter((assessment) => {
      const courseTitle = courses[assessment.course_id] || ''
      return assessment.title.toLowerCase().includes(term) || courseTitle.toLowerCase().includes(term)
    })
  }, [assessmentSearch, assessments, courses])

  const assessmentPages = Math.max(1, Math.ceil(filteredAssessments.length / pageSize))
  const resultsPages = Math.max(1, Math.ceil(recentResults.length / pageSize))

  const assessmentRows = useMemo(() => {
    const safePage = Math.min(assessmentPage, assessmentPages)
    const start = (safePage - 1) * pageSize
    return filteredAssessments.slice(start, start + pageSize)
  }, [assessmentPage, assessmentPages, filteredAssessments])

  const resultRows = useMemo(() => {
    const safePage = Math.min(resultsPage, resultsPages)
    const start = (safePage - 1) * pageSize
    return recentResults.slice(start, start + pageSize)
  }, [recentResults, resultsPage, resultsPages])

  return (
    <div className="shell" style={{ justifyContent: 'flex-start', paddingTop: 52 }}>
      <section className="panel card animate-rise" style={{ width: 'min(1000px, 100%)' }}>
        <div className="admin-header">
          <div>
            <p className="eyebrow">Learner portal</p>
            <h1 className="title" style={{ marginTop: 8 }}>Your dashboard</h1>
            <p className="subtitle" style={{ marginTop: 10 }}>Start assessments and track your latest performance.</p>
          </div>
          <div className="admin-actions">
            <button type="button" className="secondary-btn" onClick={() => void fetchData()}>Refresh</button>
            <button type="button" className="text-btn" onClick={handleSignOut}>Sign out</button>
          </div>
        </div>

        <div className="metric-grid" style={{ marginTop: 20 }}>
          <article className="metric-card">
            <p>Available assessments</p>
            <h2>{assessments.length}</h2>
            <span>Ready to attempt</span>
          </article>
          <article className="metric-card">
            <p>Attempts submitted</p>
            <h2>{results.length}</h2>
            <span>Recent submissions</span>
          </article>
          <article className="metric-card">
            <p>Average score</p>
            <h2>{averageScore}%</h2>
            <span>From your recent attempts</span>
          </article>
        </div>

        <h2 className="section-title" style={{ marginTop: 24 }}>Assessments</h2>
        {loading ? (
          <p className="subtitle" style={{ marginTop: 10 }}>Loading assessments...</p>
        ) : assessments.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 12 }}>
            <h2>No assessments yet</h2>
            <p>Your instructor has not published assessments yet.</p>
          </div>
        ) : (
          <>
            <input className="input-premium" style={{ marginTop: 10 }} placeholder="Filter assessments by title or course" value={assessmentSearch} onChange={(e) => { setAssessmentSearch(e.target.value); setAssessmentPage(1) }} />
            <div className="list-grid" style={{ marginTop: 12 }}>
            {assessmentRows.map((assessment) => (
              <article className="dashboard-item" key={assessment.assessment_id}>
                <h2>{assessment.title}</h2>
                <p>Course: {courses[assessment.course_id] || 'Unknown course'}</p>
                <p>Time limit: {assessment.time_limit} minutes</p>
                <p>
                  Attempts: {progressByAssessment[assessment.assessment_id]?.attempts || 0}
                  {' | '}
                  Best: {progressByAssessment[assessment.assessment_id]?.bestScore ?? 0}%
                </p>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ marginTop: 10 }}
                  onClick={() => navigate(`/assessments/${assessment.assessment_id}/take`)}
                >
                  Start assessment
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ marginTop: 8 }}
                  onClick={() => navigate(`/assessments/${assessment.assessment_id}/history`)}
                >
                  View attempt history
                </button>
              </article>
            ))}
            </div>
            <div className="admin-actions" style={{ marginTop: 10 }}>
              <button type="button" className="secondary-btn" disabled={assessmentPage <= 1} onClick={() => setAssessmentPage((page) => Math.max(1, page - 1))}>Previous</button>
              <span>Page {Math.min(assessmentPage, assessmentPages)} of {assessmentPages}</span>
              <button type="button" className="secondary-btn" disabled={assessmentPage >= assessmentPages} onClick={() => setAssessmentPage((page) => Math.min(assessmentPages, page + 1))}>Next</button>
            </div>
          </>
        )}

        <h2 className="section-title" style={{ marginTop: 24 }}>Recent results</h2>
        {recentResults.length === 0 ? (
          <p className="subtitle" style={{ marginTop: 10 }}>No attempts submitted yet.</p>
        ) : (
          <>
            <div className="list-grid" style={{ marginTop: 12 }}>
            {resultRows.map((result) => (
              <article className="dashboard-item" key={result.result_id}>
                <h2>{result.score}%</h2>
                <p>Status: {result.status.toUpperCase()}</p>
                <p>Assessment: {assessments.find((assessment) => assessment.assessment_id === result.assessment_id)?.title || 'Unknown assessment'}</p>
                <p>{new Date(result.created_at).toLocaleString()}</p>
              </article>
            ))}
            </div>
            <div className="admin-actions" style={{ marginTop: 10 }}>
              <button type="button" className="secondary-btn" disabled={resultsPage <= 1} onClick={() => setResultsPage((page) => Math.max(1, page - 1))}>Previous</button>
              <span>Page {Math.min(resultsPage, resultsPages)} of {resultsPages}</span>
              <button type="button" className="secondary-btn" disabled={resultsPage >= resultsPages} onClick={() => setResultsPage((page) => Math.min(resultsPages, page + 1))}>Next</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
