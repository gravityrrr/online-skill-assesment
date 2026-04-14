-- Secure scoring endpoint for learner submissions.

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
  final_status := CASE WHEN final_score >= 50 THEN 'pass' ELSE 'fail' END;

  INSERT INTO public.results (user_id, assessment_id, score, status)
  VALUES (auth.uid(), target_assessment_id, final_score, final_status);

  RETURN QUERY
  SELECT final_score, question_count, final_status;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_assessment(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_assessment(UUID, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.submit_assessment(UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_assessment(UUID, JSONB) TO authenticated;
