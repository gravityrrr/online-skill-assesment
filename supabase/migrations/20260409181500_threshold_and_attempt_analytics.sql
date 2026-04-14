-- Adds configurable pass threshold and per-question attempt analytics.

ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS pass_percentage INT;

UPDATE public.assessments
SET pass_percentage = 50
WHERE pass_percentage IS NULL;

ALTER TABLE public.assessments
ALTER COLUMN pass_percentage SET DEFAULT 50;

ALTER TABLE public.assessments
ALTER COLUMN pass_percentage SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessments_pass_percentage_check'
  ) THEN
    ALTER TABLE public.assessments
    ADD CONSTRAINT assessments_pass_percentage_check
    CHECK (pass_percentage >= 0 AND pass_percentage <= 100);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.result_answers (
  result_answer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID NOT NULL REFERENCES public.results(result_id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(question_id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (result_id, question_id)
);

ALTER TABLE public.result_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can read own result answers" ON public.result_answers;
CREATE POLICY "Learners can read own result answers"
ON public.result_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.results r
    WHERE r.result_id = result_answers.result_id
      AND r.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Instructors and Admins can read managed result answers" ON public.result_answers;
CREATE POLICY "Instructors and Admins can read managed result answers"
ON public.result_answers
FOR SELECT
USING (
  public.get_user_role() = 'Admin'
  OR (
    public.get_user_role() = 'Instructor'
    AND EXISTS (
      SELECT 1
      FROM public.users me
      WHERE me.id = auth.uid()
        AND me.is_approved = true
    )
    AND EXISTS (
      SELECT 1
      FROM public.results r
      JOIN public.assessments a ON a.assessment_id = r.assessment_id
      JOIN public.courses c ON c.course_id = a.course_id
      WHERE r.result_id = result_answers.result_id
        AND c.instructor_id = auth.uid()
    )
  )
);

CREATE OR REPLACE FUNCTION public.submit_assessment(
  target_assessment_id UUID,
  answers JSONB
)
RETURNS TABLE(score INT, total_questions INT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.user_role;
  correct_count INT := 0;
  question_count INT := 0;
  final_score INT := 0;
  final_status TEXT := 'fail';
  pass_threshold INT := 50;
  created_result_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  IF user_role <> 'Learner' THEN
    RAISE EXCEPTION 'Only learners can submit assessments';
  END IF;

  SELECT a.pass_percentage INTO pass_threshold
  FROM public.assessments a
  WHERE a.assessment_id = target_assessment_id;

  IF pass_threshold IS NULL THEN
    RAISE EXCEPTION 'Assessment not found';
  END IF;

  SELECT COUNT(*) INTO question_count
  FROM public.questions
  WHERE assessment_id = target_assessment_id;

  IF question_count = 0 THEN
    RAISE EXCEPTION 'Assessment has no questions';
  END IF;

  SELECT COUNT(*) INTO correct_count
  FROM public.questions q
  WHERE q.assessment_id = target_assessment_id
    AND COALESCE(answers ->> q.question_id::TEXT, '') = q.correct_answer;

  final_score := ROUND((correct_count::NUMERIC / question_count::NUMERIC) * 100)::INT;
  final_status := CASE WHEN final_score >= pass_threshold THEN 'pass' ELSE 'fail' END;

  INSERT INTO public.results (user_id, assessment_id, score, status)
  VALUES (auth.uid(), target_assessment_id, final_score, final_status)
  RETURNING result_id INTO created_result_id;

  INSERT INTO public.result_answers (result_id, question_id, selected_answer, is_correct)
  SELECT
    created_result_id,
    q.question_id,
    COALESCE(answers ->> q.question_id::TEXT, ''),
    COALESCE(answers ->> q.question_id::TEXT, '') = q.correct_answer
  FROM public.questions q
  WHERE q.assessment_id = target_assessment_id;

  RETURN QUERY
  SELECT final_score, question_count, final_status;
END;
$$;
