import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  Plus,
  Trash2,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  created_at?: string
}

interface AssessmentRow {
  assessment_id: string
  course_id: string
  title: string
  time_limit: number
  pass_percentage: number
  created_at: string
}

interface QuestionRow {
  question_id: string
  question_text: string
  options: unknown
  correct_answer: string
  question_order: number
}

interface QuestionDraft {
  localId: string
  question_id?: string
  question_text: string
  options: string[]
  correctOptionIndex: number | null
}

const emptyQuestion = (): QuestionDraft => ({
  localId: crypto.randomUUID(),
  question_text: '',
  options: ['', ''],
  correctOptionIndex: null,
})

function normalizeOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return []

  return options
    .map((item) => {
      if (typeof item === 'string') return item
      if (typeof item === 'number') return String(item)
      if (typeof item === 'object' && item && 'label' in item) {
        return String((item as { label: unknown }).label ?? '')
      }
      return ''
    })
    .map((value) => value.trim())
    .filter(Boolean)
}

export default function InstructorAssessmentBuilder() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [savingAssessment, setSavingAssessment] = useState(false)
  const [savingCourse, setSavingCourse] = useState(false)
  const [editorLoading, setEditorLoading] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [instructorId, setInstructorId] = useState('')
  const [instructorName, setInstructorName] = useState('Instructor')

  const [courses, setCourses] = useState<CourseRow[]>([])
  const [assessments, setAssessments] = useState<AssessmentRow[]>([])

  const [showCourseForm, setShowCourseForm] = useState(false)
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDescription, setCourseDescription] = useState('')

  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')

  const [assessmentTitle, setAssessmentTitle] = useState('')
  const [timeLimit, setTimeLimit] = useState('30')
  const [passPercentage, setPassPercentage] = useState('50')
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()])
  const [loadedQuestionIds, setLoadedQuestionIds] = useState<string[]>([])

  useEffect(() => {
    void fetchBuilderData()
  }, [])

  const assessmentsForCourse = useMemo(() => {
    if (!selectedCourseId) return assessments
    return assessments.filter((assessment) => assessment.course_id === selectedCourseId)
  }, [assessments, selectedCourseId])

  const selectedCourse = useMemo(
    () => courses.find((course) => course.course_id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  )

  const selectedAssessment = useMemo(
    () => assessments.find((assessment) => assessment.assessment_id === selectedAssessmentId) ?? null,
    [assessments, selectedAssessmentId],
  )

  const resetEditor = (courseId?: string) => {
    if (courseId !== undefined) {
      setSelectedCourseId(courseId)
    }

    setSelectedAssessmentId('')
    setAssessmentTitle('')
    setTimeLimit('30')
    setPassPercentage('50')
    setQuestions([emptyQuestion()])
    setLoadedQuestionIds([])
  }

  const syncQuery = (values: { courseId?: string; assessmentId?: string; createCourse?: boolean }) => {
    const nextQuery = new URLSearchParams()

    if (values.courseId) nextQuery.set('courseId', values.courseId)
    if (values.assessmentId) nextQuery.set('assessmentId', values.assessmentId)
    if (values.createCourse) nextQuery.set('createCourse', '1')

    setSearchParams(nextQuery)
  }

  const fetchAssessments = async (courseRows: CourseRow[]) => {
    if (courseRows.length === 0) {
      setAssessments([])
      return [] as AssessmentRow[]
    }

    const courseIds = courseRows.map((course) => course.course_id)
    const { data, error } = await supabase
      .from('assessments')
      .select('assessment_id, course_id, title, time_limit, pass_percentage, created_at')
      .in('course_id', courseIds)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    const rows = (data as AssessmentRow[]) ?? []
    setAssessments(rows)
    return rows
  }

  const loadAssessmentIntoEditor = async (
    assessmentId: string,
    sourceAssessments?: AssessmentRow[],
    skipQuerySync = false,
  ) => {
    const available = sourceAssessments ?? assessments
    const target = available.find((assessment) => assessment.assessment_id === assessmentId)

    if (!target) {
      setError('Assessment not found in your workspace.')
      return
    }

    setEditorLoading(true)
    setError('')
    setNotice('')

    const { data, error } = await supabase
      .from('questions')
      .select('question_id, question_text, options, correct_answer, question_order')
      .eq('assessment_id', assessmentId)
      .order('question_order', { ascending: true })

    if (error) {
      setError(error.message)
      setEditorLoading(false)
      return
    }

    const loadedRows = (data as QuestionRow[]) ?? []
    const drafts: QuestionDraft[] = loadedRows.length > 0
      ? loadedRows.map((row) => {
          const options = normalizeOptions(row.options)
          const safeOptions = options.length >= 2 ? options : [...options, '', ''].slice(0, 2)
          const correctIndex = safeOptions.findIndex((option) => option === row.correct_answer)

          return {
            localId: crypto.randomUUID(),
            question_id: row.question_id,
            question_text: row.question_text,
            options: safeOptions,
            correctOptionIndex: correctIndex >= 0 ? correctIndex : null,
          }
        })
      : [emptyQuestion()]

    setSelectedAssessmentId(target.assessment_id)
    setSelectedCourseId(target.course_id)
    setAssessmentTitle(target.title)
    setTimeLimit(String(target.time_limit ?? 30))
    setPassPercentage(String(target.pass_percentage ?? 50))
    setQuestions(drafts)
    setLoadedQuestionIds(loadedRows.map((row) => row.question_id))
    if (!skipQuerySync) {
      syncQuery({ courseId: target.course_id, assessmentId: target.assessment_id })
    }

    setEditorLoading(false)
  }

  const fetchBuilderData = async () => {
    setLoading(true)
    setError('')
    setNotice('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError(userError?.message || 'Unable to resolve your instructor session.')
      setLoading(false)
      return
    }

    setInstructorId(user.id)
    setInstructorName(user.user_metadata?.name || user.email?.split('@')[0] || 'Instructor')

    const [{ data: profileRow }, { data: courseRows, error: coursesError }] = await Promise.all([
      supabase.from('users').select('name').eq('id', user.id).maybeSingle(),
      supabase
        .from('courses')
        .select('course_id, title, description, created_at')
        .eq('instructor_id', user.id)
        .order('title', { ascending: true }),
    ])

    if (profileRow?.name) {
      setInstructorName(profileRow.name)
    }

    if (coursesError) {
      setError(coursesError.message)
      setLoading(false)
      return
    }

    const loadedCourses = (courseRows as CourseRow[]) ?? []
    setCourses(loadedCourses)

    const requestedCourseId = searchParams.get('courseId') || ''
    const requestedAssessmentId = searchParams.get('assessmentId') || ''
    const shouldCreateCourse = searchParams.get('createCourse') === '1'

    const availableCourseId = loadedCourses.some((course) => course.course_id === requestedCourseId)
      ? requestedCourseId
      : loadedCourses[0]?.course_id || ''

    setSelectedCourseId(availableCourseId)
    setShowCourseForm(shouldCreateCourse || loadedCourses.length === 0)

    try {
      const loadedAssessments = await fetchAssessments(loadedCourses)

      if (requestedAssessmentId) {
        await loadAssessmentIntoEditor(requestedAssessmentId, loadedAssessments, true)
      } else {
        resetEditor(availableCourseId)
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load assessments.'
      setError(message)
    }

    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const handleCourseCreate = async () => {
    if (!instructorId) {
      setError('Instructor session not available.')
      return
    }

    const nextTitle = courseTitle.trim()
    if (!nextTitle) {
      setError('Course title is required.')
      return
    }

    setSavingCourse(true)
    setError('')
    setNotice('')

    const { data, error } = await supabase
      .from('courses')
      .insert({
        instructor_id: instructorId,
        title: nextTitle,
        description: courseDescription.trim() || null,
      })
      .select('course_id, title, description, created_at')
      .single()

    if (error) {
      setError(error.message)
      setSavingCourse(false)
      return
    }

    const created = data as CourseRow
    const nextCourses = [...courses, created].sort((left, right) => left.title.localeCompare(right.title))

    setCourses(nextCourses)
    setCourseTitle('')
    setCourseDescription('')
    setShowCourseForm(false)
    resetEditor(created.course_id)
    syncQuery({ courseId: created.course_id })
    setNotice(`Course "${created.title}" created. You can now build assessments for it.`)

    try {
      await fetchAssessments(nextCourses)
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : 'Assessment list refresh failed.'
      setError(message)
    }

    setSavingCourse(false)
  }

  const addQuestion = () => {
    setQuestions((current) => [...current, emptyQuestion()])
  }

  const removeQuestion = (localId: string) => {
    setQuestions((current) => {
      if (current.length <= 1) return current
      return current.filter((question) => question.localId !== localId)
    })
  }

  const updateQuestionText = (localId: string, value: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.localId === localId ? { ...question, question_text: value } : question,
      ),
    )
  }

  const updateQuestionOption = (localId: string, optionIndex: number, value: string) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.localId !== localId) return question

        const nextOptions = [...question.options]
        nextOptions[optionIndex] = value

        return { ...question, options: nextOptions }
      }),
    )
  }

  const setQuestionCorrectOption = (localId: string, optionIndex: number) => {
    setQuestions((current) =>
      current.map((question) =>
        question.localId === localId
          ? { ...question, correctOptionIndex: optionIndex }
          : question,
      ),
    )
  }

  const addOptionToQuestion = (localId: string) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.localId !== localId) return question
        if (question.options.length >= 6) return question
        return { ...question, options: [...question.options, ''] }
      }),
    )
  }

  const removeOptionFromQuestion = (localId: string, optionIndex: number) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.localId !== localId) return question
        if (question.options.length <= 2) return question

        const nextOptions = question.options.filter((_, index) => index !== optionIndex)
        const nextCorrect = question.correctOptionIndex === null
          ? null
          : question.correctOptionIndex === optionIndex
            ? null
            : question.correctOptionIndex > optionIndex
              ? question.correctOptionIndex - 1
              : question.correctOptionIndex

        return {
          ...question,
          options: nextOptions,
          correctOptionIndex: nextCorrect,
        }
      }),
    )
  }

  const handleSaveAssessment = async () => {
    if (!selectedCourseId) {
      setError('Select or create a course before saving an assessment.')
      return
    }

    const title = assessmentTitle.trim()
    if (!title) {
      setError('Assessment title is required.')
      return
    }

    const parsedTimeLimit = Number(timeLimit)
    if (!Number.isFinite(parsedTimeLimit) || parsedTimeLimit < 1) {
      setError('Time limit must be at least 1 minute.')
      return
    }

    const parsedPassPercentage = Number(passPercentage)
    if (!Number.isFinite(parsedPassPercentage) || parsedPassPercentage < 0 || parsedPassPercentage > 100) {
      setError('Pass percentage must be between 0 and 100.')
      return
    }

    if (questions.length === 0) {
      setError('Add at least one question.')
      return
    }

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index]
      const label = `Question ${index + 1}`

      if (!question.question_text.trim()) {
        setError(`${label} requires question text.`)
        return
      }

      if (question.options.length < 2) {
        setError(`${label} requires at least two options.`)
        return
      }

      const trimmedOptions = question.options.map((option) => option.trim())
      if (trimmedOptions.some((option) => !option)) {
        setError(`${label} contains an empty option.`)
        return
      }

      const uniqueOptions = new Set(trimmedOptions.map((option) => option.toLowerCase()))
      if (uniqueOptions.size !== trimmedOptions.length) {
        setError(`${label} has duplicate options. Use unique answers only.`)
        return
      }

      if (question.correctOptionIndex === null || !trimmedOptions[question.correctOptionIndex]) {
        setError(`${label} needs a correct answer selection.`)
        return
      }
    }

    setSavingAssessment(true)
    setError('')
    setNotice('')

    let targetAssessmentId = selectedAssessmentId

    const assessmentPayload = {
      course_id: selectedCourseId,
      title,
      time_limit: Math.round(parsedTimeLimit),
      pass_percentage: Math.round(parsedPassPercentage),
    }

    if (!targetAssessmentId) {
      const { data, error } = await supabase
        .from('assessments')
        .insert(assessmentPayload)
        .select('assessment_id')
        .single()

      if (error || !data) {
        setError(error?.message || 'Assessment could not be created.')
        setSavingAssessment(false)
        return
      }

      targetAssessmentId = data.assessment_id
    } else {
      const { error } = await supabase
        .from('assessments')
        .update(assessmentPayload)
        .eq('assessment_id', targetAssessmentId)

      if (error) {
        setError(error.message)
        setSavingAssessment(false)
        return
      }
    }

    const payload = questions.map((question, index) => {
      const normalizedOptions = question.options.map((option) => option.trim())
      const correctAnswer = question.correctOptionIndex === null ? '' : normalizedOptions[question.correctOptionIndex]

      return {
        question_id: question.question_id,
        question_text: question.question_text.trim(),
        options: normalizedOptions,
        correct_answer: correctAnswer,
        question_order: index + 1,
      }
    })

    if (selectedAssessmentId) {
      const retainedIds = payload
        .map((question) => question.question_id)
        .filter((value): value is string => Boolean(value))

      const removedIds = loadedQuestionIds.filter((questionId) => !retainedIds.includes(questionId))
      if (removedIds.length > 0) {
        const { error } = await supabase.from('questions').delete().in('question_id', removedIds)
        if (error) {
          setError(error.message)
          setSavingAssessment(false)
          return
        }
      }

      for (const question of payload) {
        if (!question.question_id) continue

        const { error } = await supabase
          .from('questions')
          .update({
            question_text: question.question_text,
            options: question.options,
            correct_answer: question.correct_answer,
            question_order: question.question_order,
          })
          .eq('question_id', question.question_id)

        if (error) {
          setError(error.message)
          setSavingAssessment(false)
          return
        }
      }

      const insertRows = payload
        .filter((question) => !question.question_id)
        .map((question) => ({
          assessment_id: targetAssessmentId,
          question_text: question.question_text,
          options: question.options,
          correct_answer: question.correct_answer,
          question_order: question.question_order,
        }))

      if (insertRows.length > 0) {
        const { error } = await supabase.from('questions').insert(insertRows)
        if (error) {
          setError(error.message)
          setSavingAssessment(false)
          return
        }
      }
    } else {
      const insertRows = payload.map((question) => ({
        assessment_id: targetAssessmentId,
        question_text: question.question_text,
        options: question.options,
        correct_answer: question.correct_answer,
        question_order: question.question_order,
      }))

      const { error } = await supabase.from('questions').insert(insertRows)
      if (error) {
        setError(error.message)
        setSavingAssessment(false)
        return
      }
    }

    try {
      const refreshedAssessments = await fetchAssessments(courses)
      await loadAssessmentIntoEditor(targetAssessmentId, refreshedAssessments)
      setNotice(selectedAssessmentId ? 'Assessment updated successfully.' : 'Assessment created successfully.')
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : 'Saved, but refresh failed.'
      setError(message)
    }

    setSavingAssessment(false)
  }

  const openReviews = () => {
    if (!selectedAssessmentId) return
    navigate(`/instructor/assessments/${selectedAssessmentId}/reviews`)
  }

  return (
    <InstructorWorkspaceShell
      instructorName={instructorName}
      title="Assessment builder"
      subtitle="Create courses, structure assessments, and publish question sets from one focused editor."
      onSignOut={handleSignOut}
      onRefresh={fetchBuilderData}
      headerAction={
        <button
          type="button"
          className={instructorSecondaryButtonClass}
          onClick={() => {
            resetEditor(selectedCourseId)
            syncQuery({ courseId: selectedCourseId })
            setNotice('Started a fresh assessment draft.')
            setError('')
          }}
        >
          <FilePenLine className="h-4 w-4" />
          New draft
        </button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <section className="space-y-6">
          {error ? (
            <div className="flex items-start gap-3 rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-200" />
              <p>{error}</p>
            </div>
          ) : null}
          {notice ? (
            <div className="flex items-start gap-3 rounded-3xl border border-emerald-300/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-50">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <p>{notice}</p>
            </div>
          ) : null}

          <article className={`${instructorSurfaceClass} p-5 sm:p-6`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Course context</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Select your destination course</h2>
              </div>
              <button
                type="button"
                className={instructorSecondaryButtonClass}
                onClick={() => {
                  setShowCourseForm((current) => !current)
                  setError('')
                  setNotice('')
                }}
              >
                <Plus className="h-4 w-4" />
                {showCourseForm ? 'Close course form' : 'Create course'}
              </button>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-slate-400">Loading course options...</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  value={selectedCourseId}
                  onChange={(event) => {
                    const nextCourseId = event.target.value
                    resetEditor(nextCourseId)
                    syncQuery({ courseId: nextCourseId, createCourse: showCourseForm })
                    setNotice('')
                    setError('')
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 focus:border-indigo-300/50 focus:outline-none"
                >
                  {courses.length === 0 ? <option value="">No courses yet</option> : null}
                  {courses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.title}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className={instructorSecondaryButtonClass}
                  onClick={() => resetEditor(selectedCourseId)}
                  disabled={!selectedCourseId}
                >
                  Reset draft
                </button>
              </div>
            )}

            {showCourseForm ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="grid gap-3">
                  <input
                    value={courseTitle}
                    onChange={(event) => setCourseTitle(event.target.value)}
                    placeholder="Course title"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300/50 focus:outline-none"
                  />
                  <textarea
                    value={courseDescription}
                    onChange={(event) => setCourseDescription(event.target.value)}
                    placeholder="Course description (optional)"
                    rows={3}
                    className="w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    className={instructorPrimaryButtonClass}
                    onClick={() => void handleCourseCreate()}
                    disabled={savingCourse}
                  >
                    {savingCourse ? 'Creating...' : 'Save course'}
                  </button>
                </div>
              </div>
            ) : null}
          </article>

          <article className={`${instructorSurfaceClass} p-5 sm:p-6`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Assessment setup</p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {selectedAssessmentId ? 'Edit assessment draft' : 'Create assessment draft'}
                </h2>
              </div>
              {selectedAssessment ? (
                <button type="button" className={instructorSecondaryButtonClass} onClick={openReviews}>
                  Open reviews
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-300">
                Assessment title
                <input
                  value={assessmentTitle}
                  onChange={(event) => setAssessmentTitle(event.target.value)}
                  placeholder="Midterm fundamentals"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300/50 focus:outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Time limit (minutes)
                <input
                  type="number"
                  min={1}
                  value={timeLimit}
                  onChange={(event) => setTimeLimit(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300/50 focus:outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300 sm:col-span-2">
                Pass threshold (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passPercentage}
                  onChange={(event) => setPassPercentage(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300/50 focus:outline-none"
                />
              </label>
            </div>
          </article>

          <article className={`${instructorSurfaceClass} p-5 sm:p-6`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Question editor</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Build your question set</h2>
              </div>
              <button type="button" className={instructorSecondaryButtonClass} onClick={addQuestion}>
                <Plus className="h-4 w-4" />
                Add question
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {questions.map((question, questionIndex) => (
                <article key={question.localId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-100">Question {questionIndex + 1}</p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => removeQuestion(question.localId)}
                      disabled={questions.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={question.question_text}
                    onChange={(event) => updateQuestionText(question.localId, event.target.value)}
                    placeholder="Write the question prompt"
                    className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300/50 focus:outline-none"
                  />

                  <div className="mt-4 space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={`${question.localId}-option-${optionIndex}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${question.localId}`}
                          checked={question.correctOptionIndex === optionIndex}
                          onChange={() => setQuestionCorrectOption(question.localId, optionIndex)}
                          className="h-4 w-4 accent-indigo-400"
                        />
                        <input
                          value={option}
                          onChange={(event) => updateQuestionOption(question.localId, optionIndex, event.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-300/50 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeOptionFromQuestion(question.localId, optionIndex)}
                          disabled={question.options.length <= 2}
                          className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                    onClick={() => addOptionToQuestion(question.localId)}
                    disabled={question.options.length >= 6}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add option
                  </button>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={instructorPrimaryButtonClass}
                onClick={() => void handleSaveAssessment()}
                disabled={savingAssessment || loading || editorLoading}
              >
                {savingAssessment
                  ? 'Saving...'
                  : selectedAssessmentId
                    ? 'Update assessment'
                    : 'Create assessment'}
              </button>
              {selectedAssessmentId ? (
                <button
                  type="button"
                  className={instructorSecondaryButtonClass}
                  onClick={openReviews}
                >
                  Open reviews
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </article>
        </section>

        <aside className="space-y-6">
          <article className={`${instructorSurfaceClass} p-5`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace status</p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              {selectedCourse ? selectedCourse.title : 'No course selected'}
            </h3>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Course count</p>
                <p className="mt-2 text-2xl font-semibold text-white">{courses.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Assessments in course</p>
                <p className="mt-2 text-2xl font-semibold text-white">{assessmentsForCourse.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Draft questions</p>
                <p className="mt-2 text-2xl font-semibold text-white">{questions.length}</p>
              </div>
            </div>
          </article>

          <article className={`${instructorSurfaceClass} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Assessment library</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Open existing drafts</h3>
              </div>
              <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {assessmentsForCourse.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {loading || editorLoading ? (
                <p className="text-sm text-slate-400">Loading assessments...</p>
              ) : assessmentsForCourse.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  No assessments in this course yet.
                </div>
              ) : (
                assessmentsForCourse.map((assessment) => {
                  const active = assessment.assessment_id === selectedAssessmentId
                  return (
                    <button
                      key={assessment.assessment_id}
                      type="button"
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? 'border-indigo-300/40 bg-indigo-500/15'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                      onClick={() => void loadAssessmentIntoEditor(assessment.assessment_id)}
                    >
                      <p className="text-sm font-semibold text-slate-100">{assessment.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {assessment.time_limit} min · pass {assessment.pass_percentage}%
                      </p>
                    </button>
                  )
                })
              )}
            </div>
          </article>

          <article className={`${instructorSurfaceClass} p-5`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Builder tips</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <BookOpen className="mt-0.5 h-4 w-4 text-sky-300" />
                <p className="text-sm text-slate-300">Keep options short and unambiguous for faster learner completion.</p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <ClipboardList className="mt-0.5 h-4 w-4 text-indigo-300" />
                <p className="text-sm text-slate-300">Set pass threshold per assessment to reflect skill depth, not question count.</p>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </InstructorWorkspaceShell>
  )
}
