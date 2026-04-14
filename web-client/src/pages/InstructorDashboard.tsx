import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  Plus,
  TriangleAlert,
  Trophy,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import InstructorWorkspaceShell, {
  instructorPrimaryButtonClass,
  instructorSecondaryButtonClass,
  instructorSurfaceClass,
} from '../components/InstructorWorkspaceShell'
import { supabase } from '../lib/supabase'

interface CourseRow {
  course_id: string
  title: string
  description: string | null
}

interface AssessmentRow {
  assessment_id: string
  course_id: string
  title: string
  time_limit: number | null
}

interface QuestionRow {
  question_id: string
  assessment_id: string
  question_text: string
}

interface ResultRow {
  result_id: string
  assessment_id: string
  score: number | null
  user_id?: string
}

interface ResultAnswerRow {
  question_id: string
  is_correct: boolean | null
}

interface CourseCardData extends CourseRow {
  assessmentCount: number
  submissionCount: number
  averageScore: number
  averageTimeLimit: number
  completionRate: number
  featuredAssessmentId: string | null
}

interface DashboardStats {
  totalCourses: number
  publishedAssessments: number
  averageLearnerScore: number
  completionRate: number
  activeLearners: number
}

interface CourseAveragePoint {
  courseId: string
  label: string
  average: number
}

interface QuestionAccuracyPoint {
  questionId: string
  label: string
  accuracy: number
  attempts: number
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function formatPercent(value: number) {
  return `${Math.round(clampPercent(value))}%`
}

function formatMinutes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '--'
  return `${Math.round(value)} min`
}

function shorten(value: string, max = 44) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}...`
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'IN'
}

function StatSkeleton() {
  return <div className={`${surfaceClass} h-36 animate-pulse bg-slate-900/70`} />
}

function PanelSkeleton() {
  return <div className={`${surfaceClass} h-80 animate-pulse bg-slate-900/70`} />
}

function CourseSkeleton() {
  return <div className={`${surfaceClass} h-80 animate-pulse bg-slate-900/70`} />
}

function EmptyCourses({ onCreate }: { onCreate: () => void }) {
  return (
    <div className={`${instructorSurfaceClass} flex min-h-[280px] flex-col items-center justify-center p-10 text-center`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
        <BookOpen className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-white">No courses yet</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
        Create your first course to start building assessments and tracking learner performance.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className={`mt-6 ${instructorPrimaryButtonClass}`}
      >
        <Plus className="h-4 w-4" />
        Create course
      </button>
    </div>
  )
}

function QuickMenu({
  open,
  onToggle,
  onReviews,
  onBuilder,
}: {
  open: boolean
  onToggle: () => void
  onReviews: () => void
  onBuilder: () => void
}) {
  return (
    <div className="relative">
      <button type="button" onClick={onToggle} className={instructorSecondaryButtonClass}>
        Actions
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-white/10 bg-slate-950 p-2 shadow-2xl">
          <button type="button" onClick={onReviews} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/5">
            Open reviews
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
          <button type="button" onClick={onBuilder} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/5">
            Open builder
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function InstructorDashboard() {
  const navigate = useNavigate()
  const menuRootRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [instructorName, setInstructorName] = useState('Instructor')
  const [openMenuCourseId, setOpenMenuCourseId] = useState<string | null>(null)
  const [courses, setCourses] = useState<CourseCardData[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    publishedAssessments: 0,
    averageLearnerScore: 0,
    completionRate: 0,
    activeLearners: 0,
  })
  const [courseAverages, setCourseAverages] = useState<CourseAveragePoint[]>([])
  const [hardestQuestions, setHardestQuestions] = useState<QuestionAccuracyPoint[]>([])
  const [questionAccuracyAvailable, setQuestionAccuracyAvailable] = useState(true)

  useEffect(() => {
    void fetchDashboard()
  }, [])

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!menuRootRef.current) return
      if (!menuRootRef.current.contains(event.target as Node)) {
        setOpenMenuCourseId(null)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const fetchDashboard = async () => {
    setLoading(true)
    setError('')
    setNotice('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError(userError?.message || 'Unable to load instructor session.')
      setLoading(false)
      return
    }

    setInstructorName(user.user_metadata?.name || user.email?.split('@')[0] || 'Instructor')

    const [{ data: profileRow }, { data: courseRows, error: courseError }] = await Promise.all([
      supabase.from('users').select('name').eq('id', user.id).maybeSingle(),
      supabase.from('courses').select('course_id, title, description').eq('instructor_id', user.id).order('title', { ascending: true }),
    ])

    if (profileRow?.name) {
      setInstructorName(profileRow.name)
    }

    if (courseError) {
      setError(courseError.message)
      setLoading(false)
      return
    }

    const safeCourses = (courseRows as CourseRow[]) ?? []
    if (safeCourses.length === 0) {
      setCourses([])
      setCourseAverages([])
      setHardestQuestions([])
      setQuestionAccuracyAvailable(true)
      setStats({
        totalCourses: 0,
        publishedAssessments: 0,
        averageLearnerScore: 0,
        completionRate: 0,
        activeLearners: 0,
      })
      setLoading(false)
      return
    }

    const courseIds = safeCourses.map((course) => course.course_id)
    const { data: assessmentRows, error: assessmentError } = await supabase
      .from('assessments')
      .select('assessment_id, course_id, title, time_limit')
      .in('course_id', courseIds)

    if (assessmentError) {
      setError(assessmentError.message)
      setLoading(false)
      return
    }

    const assessments = (assessmentRows as AssessmentRow[]) ?? []
    const assessmentIds = assessments.map((assessment) => assessment.assessment_id)

    const questionsResponse = assessmentIds.length > 0
      ? await supabase.from('questions').select('question_id, assessment_id, question_text').in('assessment_id', assessmentIds)
      : { data: [], error: null }

    if (questionsResponse.error) {
      setError(questionsResponse.error.message)
      setLoading(false)
      return
    }

    const questions = (questionsResponse.data as QuestionRow[]) ?? []

    let results: ResultRow[] = []
    let answerRows: ResultAnswerRow[] = []

    if (assessmentIds.length > 0) {
      const shouldLoadAnswers = questions.length > 0
      const [resultsResponse, answersResponse] = await Promise.all([
        supabase.from('results').select('result_id, assessment_id, score, user_id').in('assessment_id', assessmentIds),
        shouldLoadAnswers
          ? supabase.from('result_answers').select('question_id, is_correct').in('question_id', questions.map((question) => question.question_id))
          : Promise.resolve({ data: [], error: null }),
      ])

      if (resultsResponse.error) {
        setError(resultsResponse.error.message)
        setLoading(false)
        return
      }

      results = (resultsResponse.data as ResultRow[]) ?? []

      if (answersResponse.error) {
        setQuestionAccuracyAvailable(false)
        setNotice('Question-level analytics are unavailable until answer review data exists.')
      } else {
        answerRows = (answersResponse.data as ResultAnswerRow[]) ?? []
        setQuestionAccuracyAvailable(true)
      }
    }

    const assessmentsByCourse = assessments.reduce<Record<string, AssessmentRow[]>>((acc, assessment) => {
      if (!acc[assessment.course_id]) acc[assessment.course_id] = []
      acc[assessment.course_id].push(assessment)
      return acc
    }, {})

    const resultsByAssessment = results.reduce<Record<string, ResultRow[]>>((acc, result) => {
      if (!acc[result.assessment_id]) acc[result.assessment_id] = []
      acc[result.assessment_id].push(result)
      return acc
    }, {})

    const assessmentIdsWithResults = new Set(results.map((result) => result.assessment_id))
    const activeLearners = new Set(results.map((result) => result.user_id).filter((value): value is string => Boolean(value))).size
    const averageLearnerScore = results.length > 0
      ? results.reduce((sum, result) => sum + Number(result.score || 0), 0) / results.length
      : 0
    const completionRate = assessments.length > 0
      ? (assessmentIdsWithResults.size / assessments.length) * 100
      : 0

    const courseCards = safeCourses.map((course) => {
      const relatedAssessments = assessmentsByCourse[course.course_id] || []
      const relatedResults = relatedAssessments.flatMap((assessment) => resultsByAssessment[assessment.assessment_id] || [])
      const completedCount = relatedAssessments.filter((assessment) => assessmentIdsWithResults.has(assessment.assessment_id)).length

      return {
        ...course,
        assessmentCount: relatedAssessments.length,
        submissionCount: relatedResults.length,
        averageScore: relatedResults.length > 0
          ? relatedResults.reduce((sum, result) => sum + Number(result.score || 0), 0) / relatedResults.length
          : 0,
        averageTimeLimit: relatedAssessments.length > 0
          ? relatedAssessments.reduce((sum, assessment) => sum + Number(assessment.time_limit || 0), 0) / relatedAssessments.length
          : 0,
        completionRate: relatedAssessments.length > 0 ? (completedCount / relatedAssessments.length) * 100 : 0,
        featuredAssessmentId: relatedAssessments[0]?.assessment_id || null,
      }
    })

    const questionLookup = questions.reduce<Record<string, string>>((acc, question) => {
      acc[question.question_id] = question.question_text
      return acc
    }, {})

    const questionAccuracy = answerRows.reduce<Record<string, { attempts: number; correct: number }>>((acc, row) => {
      if (!acc[row.question_id]) acc[row.question_id] = { attempts: 0, correct: 0 }
      acc[row.question_id].attempts += 1
      if (row.is_correct) acc[row.question_id].correct += 1
      return acc
    }, {})

    setCourses(courseCards)
    setStats({
      totalCourses: safeCourses.length,
      publishedAssessments: assessments.length,
      averageLearnerScore,
      completionRate,
      activeLearners,
    })
    setCourseAverages(
      courseCards
        .filter((course) => course.assessmentCount > 0)
        .sort((left, right) => right.averageScore - left.averageScore)
        .slice(0, 5)
        .map((course) => ({ courseId: course.course_id, label: shorten(course.title, 18), average: course.averageScore })),
    )
    setHardestQuestions(
      Object.entries(questionAccuracy)
        .map(([questionId, value]) => ({
          questionId,
          label: shorten(questionLookup[questionId] || 'Untitled question', 50),
          accuracy: value.attempts > 0 ? (value.correct / value.attempts) * 100 : 0,
          attempts: value.attempts,
        }))
        .sort((left, right) => left.accuracy - right.accuracy)
        .slice(0, 5),
    )

    setLoading(false)
  }

  const topCourse = useMemo(() => {
    if (courses.length === 0) return null
    return [...courses].sort((left, right) => right.submissionCount - left.submissionCount)[0]
  }, [courses])

  const averageTimeAcrossCourses = useMemo(() => {
    if (courses.length === 0) return 0
    return courses.reduce((sum, course) => sum + Number(course.averageTimeLimit || 0), 0) / courses.length
  }, [courses])

  const openBuilder = (params?: { courseId?: string; assessmentId?: string; createCourse?: boolean }) => {
    const query = new URLSearchParams()

    if (params?.courseId) query.set('courseId', params.courseId)
    if (params?.assessmentId) query.set('assessmentId', params.assessmentId)
    if (params?.createCourse) query.set('createCourse', '1')

    const queryString = query.toString()
    navigate(queryString ? `/instructor/assessment-builder?${queryString}` : '/instructor/assessment-builder')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <InstructorWorkspaceShell
      instructorName={instructorName}
      title="Dashboard overview"
      subtitle="Manage courses, review assessment performance, and monitor learner activity from one aligned workspace."
      onSignOut={handleSignOut}
      onRefresh={fetchDashboard}
      headerAction={
        <button type="button" onClick={() => openBuilder()} className={instructorPrimaryButtonClass}>
          <Plus className="h-4 w-4" />
          New assessment
        </button>
      }
    >
      <div className="grid gap-6" ref={menuRootRef}>
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <div className={`${instructorSurfaceClass} px-5 py-6 sm:px-6`}>
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-medium text-indigo-300">Welcome back, {instructorName}</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                  Build better assessments with clearer insight.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  The new premium layout keeps spacing, typography, and action hierarchy aligned across every dashboard section.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
                <button
                  type="button"
                  onClick={() => openBuilder({ createCourse: true })}
                  className={instructorPrimaryButtonClass}
                >
                  <Plus className="h-4 w-4" />
                  Create course
                </button>
                <button type="button" onClick={() => openBuilder()} className={instructorSecondaryButtonClass}>
                  <ClipboardList className="h-4 w-4" />
                  Build assessment
                </button>
              </div>
            </div>
          </div>

          <aside className={`${instructorSurfaceClass} px-5 py-6 sm:px-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Snapshot</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Today at a glance</h3>
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Most active course</p>
                <p className="mt-2 text-base font-semibold text-white">{topCourse?.title || 'No course activity yet'}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {topCourse
                    ? `${topCourse.submissionCount} submissions tracked`
                    : 'Publish a course to start collecting data.'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Average learner score</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatPercent(stats.averageLearnerScore)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Average assessment time</p>
                <p className="mt-2 text-2xl font-semibold text-sky-300">{formatMinutes(averageTimeAcrossCourses)}</p>
              </div>
            </div>
          </aside>
        </section>

        {error ? (
          <section className="rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </section>
        ) : null}
        {notice ? (
          <section className="flex items-start gap-3 rounded-3xl border border-amber-300/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-50">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>{notice}</span>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <article className={`${instructorSurfaceClass} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Courses</p>
                    <p className="mt-3 text-4xl font-semibold text-white">{stats.totalCourses}</p>
                    <p className="mt-2 text-sm text-slate-500">Managed by you</p>
                  </div>
                  <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>
              </article>
              <article className={`${instructorSurfaceClass} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Assessments</p>
                    <p className="mt-3 text-4xl font-semibold text-white">{stats.publishedAssessments}</p>
                    <p className="mt-2 text-sm text-slate-500">Published live</p>
                  </div>
                  <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
              </article>
              <article className={`${instructorSurfaceClass} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Completion rate</p>
                    <p className="mt-3 text-4xl font-semibold text-white">{formatPercent(stats.completionRate)}</p>
                    <p className="mt-2 text-sm text-slate-500">Assessments with attempts</p>
                  </div>
                  <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-300">
                    <Trophy className="h-5 w-5" />
                  </div>
                </div>
              </article>
              <article className={`${instructorSurfaceClass} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Active learners</p>
                    <p className="mt-3 text-4xl font-semibold text-white">{stats.activeLearners}</p>
                    <p className="mt-2 text-sm text-slate-500">Unique submissions</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </article>
            </>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {loading ? (
            <>
              <PanelSkeleton />
              <PanelSkeleton />
            </>
          ) : (
            <>
              <article className={`${instructorSurfaceClass} p-6`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Analytics</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Course averages</h2>
                    <p className="mt-2 text-sm text-slate-400">Bar-style overview of strongest and weakest course performance.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">Top courses</div>
                </div>

                <div className="mt-8 space-y-4">
                  {courseAverages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">
                      Course averages appear after learners submit results.
                    </div>
                  ) : (
                    courseAverages.map((course) => (
                      <div key={course.courseId} className="space-y-2">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="font-medium text-slate-200">{course.label}</span>
                          <span className="text-slate-400">{formatPercent(course.average)}</span>
                        </div>
                        <div className="h-3 rounded-full bg-white/5">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500"
                            style={{ width: `${clampPercent(course.average)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className={`${instructorSurfaceClass} p-6`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Question accuracy</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Hardest questions</h2>
                    <p className="mt-2 text-sm text-slate-400">Lowest-scoring questions help you spot content that needs revision.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">Accuracy</div>
                </div>

                <div className="mt-8 space-y-4">
                  {!questionAccuracyAvailable ? (
                    <div className="rounded-2xl border border-dashed border-amber-300/20 bg-amber-500/10 p-5 text-sm text-amber-50">
                      Answer-level analytics are not available yet.
                    </div>
                  ) : hardestQuestions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">
                      Hardest-question insights appear after assessment attempts are submitted.
                    </div>
                  ) : (
                    hardestQuestions.map((question) => (
                      <div key={question.questionId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm font-medium leading-6 text-slate-100">{question.label}</p>
                          <span className="rounded-xl bg-rose-500/10 px-3 py-1 text-sm font-semibold text-rose-100">
                            {formatPercent(question.accuracy)}
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">{question.attempts} reviewed answers</p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </>
          )}
        </section>

        <section className={`${instructorSurfaceClass} p-6`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Course management</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Course portfolio</h2>
              <p className="mt-2 text-sm text-slate-400">Each course now links to a working builder flow for real assessment creation.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              {loading ? 'Loading courses...' : `${courses.length} course${courses.length === 1 ? '' : 's'}`}
            </div>
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <CourseSkeleton />
                <CourseSkeleton />
                <CourseSkeleton />
              </div>
            ) : courses.length === 0 ? (
              <EmptyCourses onCreate={() => openBuilder({ createCourse: true })} />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => (
                  <article key={course.course_id} className={`${instructorSurfaceClass} flex h-full flex-col p-5`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex rounded-full bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
                          Course
                        </span>
                        <h3 className="mt-4 text-lg font-semibold text-white">{course.title}</h3>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
                          {course.description?.trim() || 'No course description yet. Add one so learners understand the context.'}
                        </p>
                      </div>

                      <QuickMenu
                        open={openMenuCourseId === course.course_id}
                        onToggle={() =>
                          setOpenMenuCourseId((current) =>
                            current === course.course_id ? null : course.course_id,
                          )
                        }
                        onReviews={() => {
                          setOpenMenuCourseId(null)
                          if (course.featuredAssessmentId) {
                            navigate(`/instructor/assessments/${course.featuredAssessmentId}/reviews`)
                            return
                          }
                          setNotice('No assessment found for this course yet. Open the builder to create one.')
                        }}
                        onBuilder={() => {
                          setOpenMenuCourseId(null)
                          openBuilder({ courseId: course.course_id })
                        }}
                      />
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Assessments</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{course.assessmentCount}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Avg score</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{formatPercent(course.averageScore)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Coverage</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{formatPercent(course.completionRate)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Time</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{formatMinutes(course.averageTimeLimit)}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-1 items-end">
                      <div className="flex w-full items-center justify-between gap-4 border-t border-white/10 pt-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-200">{course.submissionCount} submissions tracked</p>
                          <p className="mt-1 text-xs text-slate-500">Latest activity in this course</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (course.featuredAssessmentId) {
                              navigate(`/instructor/assessments/${course.featuredAssessmentId}/reviews`)
                              return
                            }
                            openBuilder({ courseId: course.course_id })
                          }}
                          className={instructorSecondaryButtonClass}
                        >
                          {course.featuredAssessmentId ? 'Open reviews' : 'Open builder'}
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className={`${instructorSurfaceClass} p-5`}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-300">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Assessment density</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {stats.totalCourses > 0 ? `${(stats.publishedAssessments / stats.totalCourses).toFixed(1)} per course` : '--'}
                </p>
              </div>
            </div>
          </article>
          <article className={`${instructorSurfaceClass} p-5`}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Typical time limit</p>
                <p className="mt-1 text-lg font-semibold text-white">{formatMinutes(averageTimeAcrossCourses)}</p>
              </div>
            </div>
          </article>
          <article className={`${instructorSurfaceClass} p-5`}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Best-performing course</p>
                <p className="mt-1 text-lg font-semibold text-white">{courseAverages[0]?.label || 'Awaiting data'}</p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </InstructorWorkspaceShell>
  )
}
