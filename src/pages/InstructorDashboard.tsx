import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  Plus,
  Sparkles,
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

function StatSkeleton() {
  return <div className="skeleton h-36" />
}

function PanelSkeleton() {
  return <div className="skeleton h-80" />
}

function CourseSkeleton() {
  return <div className="skeleton h-80" />
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
        <button type="button" onClick={() => openBuilder()} className="btn-primary">
          <Plus className="h-4 w-4" />
          New assessment
        </button>
      }
    >
      <div className="flex flex-col gap-10 pb-16" ref={menuRootRef}>
        
        {/* Welcome Section - Stunning Hero Banner */}
        <section className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-indigo-900/40 via-slate-900/80 to-[#101218]/90 p-10 sm:p-14 hover-glow hover-lift animate-slide-up shadow-2xl">
          {/* Decorative glowing orb */}
          <div className="absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-indigo-500/20 blur-[100px] transition-all duration-700 group-hover:bg-indigo-400/30" />
          <div className="absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-sky-500/10 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-300 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Instructor Portal
              </span>
              <h2 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 sm:text-5xl">
                Welcome back, {instructorName}.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
                Build better assessments with clearer insight. This new premium layout keeps spacing, typography, and action hierarchy perfectly aligned.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row shrink-0">
              <button
                type="button"
                onClick={() => openBuilder({ createCourse: true })}
                className="btn-primary flex-1"
              >
                <Plus className="h-4 w-4" />
                Create course
              </button>
              <button type="button" onClick={() => openBuilder()} className="btn-secondary flex-1">
                <ClipboardList className="h-4 w-4" />
                Build assessment
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-200 backdrop-blur-md">
            <TriangleAlert className="h-5 w-5 shrink-0 text-rose-400" />
            <p>{error}</p>
          </section>
        ) : null}
        
        {notice ? (
          <section className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-sm text-amber-200 backdrop-blur-md">
            <TriangleAlert className="h-5 w-5 shrink-0 text-amber-400" />
            <p>{notice}</p>
          </section>
        ) : null}

        {/* Stats Grid */}
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <article className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#101218]/80 p-8 flex flex-col justify-between backdrop-blur-xl hover-lift shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 flex items-start justify-between gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Courses</p>
                    <p className="mt-3 text-4xl font-extrabold text-white">{stats.totalCourses}</p>
                    <p className="mt-2 text-sm text-slate-500">Managed by you</p>
                  </div>
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-400 transition-transform duration-300 group-hover:scale-110">
                    <BookOpen className="h-6 w-6" />
                  </div>
                </div>
              </article>
              
              <article className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#101218]/80 p-8 flex flex-col justify-between backdrop-blur-xl hover-lift shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 flex items-start justify-between gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assessments</p>
                    <p className="mt-3 text-4xl font-extrabold text-white">{stats.publishedAssessments}</p>
                    <p className="mt-2 text-sm text-slate-500">Published live</p>
                  </div>
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 text-violet-400 transition-transform duration-300 group-hover:scale-110">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                </div>
              </article>
              
              <article className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#101218]/80 p-8 flex flex-col justify-between backdrop-blur-xl hover-lift shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 flex items-start justify-between gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Completion</p>
                    <p className="mt-3 text-4xl font-extrabold text-white">{formatPercent(stats.completionRate)}</p>
                    <p className="mt-2 text-sm text-slate-500">Assessments engaged</p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-400 transition-transform duration-300 group-hover:scale-110">
                    <Trophy className="h-6 w-6" />
                  </div>
                </div>
              </article>
              
              <article className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#101218]/80 p-8 flex flex-col justify-between backdrop-blur-xl hover-lift shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 flex items-start justify-between gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Learners</p>
                    <p className="mt-3 text-4xl font-extrabold text-white">{stats.activeLearners}</p>
                    <p className="mt-2 text-sm text-slate-500">Unique submissions</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 transition-transform duration-300 group-hover:scale-110">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </article>
            </>
          )}
        </section>

        {/* Two-Column Analytics */}
        <section className="grid gap-8 xl:grid-cols-2">
          {loading ? (
            <>
              <PanelSkeleton />
              <PanelSkeleton />
            </>
          ) : (
            <>
              {/* Course Averages */}
              <article className="rounded-[2.5rem] border border-white/5 bg-[#101218]/80 p-10 backdrop-blur-xl shadow-2xl hover-lift">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-xs font-extrabold uppercase tracking-[0.2em] text-transparent">
                      Analytics Pulse
                    </p>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">Course Averages</h2>
                    <p className="mt-2 text-sm text-slate-400">Snapshot of your strongest and weakest course performance.</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                    Top courses
                  </span>
                </div>

                <div className="mt-10 flex flex-col gap-6">
                  {courseAverages.length === 0 ? (
                    <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
                      Performance data will illuminate here after learners complete assessments.
                    </div>
                  ) : (
                    courseAverages.map((course, idx) => (
                      <div key={course.courseId} className="group relative">
                        <div className="mb-3 flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-200 transition-colors group-hover:text-white">{course.label}</span>
                          <span className="font-bold text-sky-300">{formatPercent(course.average)}</span>
                        </div>
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-1000 ease-out"
                            style={{ width: `${clampPercent(course.average)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              {/* Hardest Questions */}
              <article className="rounded-[2.5rem] border border-white/5 bg-[#101218]/80 p-10 backdrop-blur-xl shadow-2xl hover-lift">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-xs font-extrabold uppercase tracking-[0.2em] text-transparent">
                      Content Review
                    </p>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">Hardest Questions</h2>
                    <p className="mt-2 text-sm text-slate-400">Spot knowledge gaps and revise low-scoring assessment items.</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
                    Accuracy
                  </span>
                </div>

                <div className="mt-10 flex flex-col gap-4">
                  {!questionAccuracyAvailable ? (
                    <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 p-6 text-center text-sm text-amber-200/70">
                      Answer-level analytics will be unlocked once reviews are active.
                    </div>
                  ) : hardestQuestions.length === 0 ? (
                    <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
                      Insights will emerge when assessment attempts are submitted.
                    </div>
                  ) : (
                    hardestQuestions.map((question) => (
                      <div key={question.questionId} className="group flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04]">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-200 group-hover:text-white">{question.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{question.attempts} reviewed answers</p>
                        </div>
                        <span className="shrink-0 rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 ring-1 ring-rose-500/20">
                          {formatPercent(question.accuracy)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </>
          )}
        </section>

        {/* Course Portfolio */}
        <section className="mt-4">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between px-2">
            <div>
              <p className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-xs font-extrabold uppercase tracking-[0.2em] text-transparent">
                Course Management
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Course Portfolio</h2>
              <p className="mt-2 text-sm text-slate-400">Seamlessly move from high-level stats into the working assessment builder.</p>
            </div>
            <p className="text-sm font-medium text-slate-400">
              {loading ? 'Curating portfolio...' : `${courses.length} active course${courses.length === 1 ? '' : 's'}`}
            </p>
          </div>

          <div>
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <CourseSkeleton />
                <CourseSkeleton />
                <CourseSkeleton />
              </div>
            ) : courses.length === 0 ? (
              <EmptyCourses onCreate={() => openBuilder({ createCourse: true })} />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <article key={course.course_id} className="group flex flex-col rounded-[2.5rem] border border-white/5 bg-[#101218]/60 p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:bg-[#101218]/90 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:border-white/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-[10px] font-black uppercase tracking-[0.25em] text-transparent">
                          Course Blueprint
                        </span>
                        <h3 className="mt-3 truncate text-xl font-bold text-white tracking-tight">{course.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-400 leading-relaxed">
                          {course.description?.trim() || 'No description provided. Add details to guide your learners.'}
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
                          setNotice('No assessment found for this course yet.')
                        }}
                        onBuilder={() => {
                          setOpenMenuCourseId(null)
                          openBuilder({ courseId: course.course_id })
                        }}
                      />
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-px rounded-2xl bg-white/5 overflow-hidden">
                      <div className="bg-[#101218] p-4 text-center transition-colors group-hover:bg-[#151821]">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Assessments</p>
                        <p className="mt-1 text-2xl font-bold text-slate-200">{course.assessmentCount}</p>
                      </div>
                      <div className="bg-[#101218] p-4 text-center transition-colors group-hover:bg-[#151821]">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Avg Score</p>
                        <p className="mt-1 text-2xl font-bold text-sky-300">{formatPercent(course.averageScore)}</p>
                      </div>
                      <div className="bg-[#101218] p-4 text-center transition-colors group-hover:bg-[#151821]">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Coverage</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-300">{formatPercent(course.completionRate)}</p>
                      </div>
                      <div className="bg-[#101218] p-4 text-center transition-colors group-hover:bg-[#151821]">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Avg Time</p>
                        <p className="mt-1 text-2xl font-bold text-amber-300">{formatMinutes(course.averageTimeLimit)}</p>
                      </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                          <Users className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-semibold text-slate-400 group-hover:text-slate-300">{course.submissionCount} subs</p>
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
                        className="btn-secondary"
                      >
                        {course.featuredAssessmentId ? 'Reviews' : 'Builder'}
                        <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </InstructorWorkspaceShell>
  )
}
