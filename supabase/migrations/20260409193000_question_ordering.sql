-- Adds stable question ordering per assessment for editor reorder support.

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS question_order INT;

WITH ranked AS (
  SELECT
    question_id,
    ROW_NUMBER() OVER (PARTITION BY assessment_id ORDER BY created_at, question_id) AS row_num
  FROM public.questions
)
UPDATE public.questions q
SET question_order = ranked.row_num
FROM ranked
WHERE q.question_id = ranked.question_id
  AND q.question_order IS NULL;

ALTER TABLE public.questions
ALTER COLUMN question_order SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS questions_assessment_order_idx
ON public.questions (assessment_id, question_order);
