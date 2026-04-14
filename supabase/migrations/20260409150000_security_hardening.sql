-- Security hardening for auth functions and role-based RLS behavior.

-- 1) Lock trigger function search_path and prevent signup metadata from self-assigning Admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT;
  extracted_role public.user_role;
  approval_status BOOLEAN;
BEGIN
  requested_role := COALESCE(new.raw_user_meta_data->>'role', 'Learner');

  IF requested_role = 'Instructor' THEN
    extracted_role := 'Instructor'::public.user_role;
    approval_status := false;
  ELSE
    extracted_role := 'Learner'::public.user_role;
    approval_status := true;
  END IF;

  INSERT INTO public.users (id, email, name, role, is_approved)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Unknown User'),
    extracted_role,
    approval_status
  )
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      is_approved = EXCLUDED.is_approved,
      name = EXCLUDED.name,
      email = EXCLUDED.email;

  RETURN new;
END;
$$;

-- 2) Lock approve RPC search_path and make execute permissions explicit.
CREATE OR REPLACE FUNCTION public.approve_instructor(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM public.users WHERE id = auth.uid()) <> 'Admin' THEN
    RAISE EXCEPTION 'Only Admin can approve instructors';
  END IF;

  UPDATE public.users
  SET is_approved = true
  WHERE id = target_user_id
    AND role = 'Instructor';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user is not an Instructor or does not exist';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_instructor(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_instructor(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.approve_instructor(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.approve_instructor(UUID) TO authenticated;

-- 3) Ensure only approved instructors can read all users.
DROP POLICY IF EXISTS "Instructors and Admins can read all users" ON public.users;
CREATE POLICY "Instructors and Admins can read all users"
ON public.users
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
  )
);

-- 4) Prevent instructors from inserting courses on behalf of other instructors.
DROP POLICY IF EXISTS "Instructors and Admins can insert courses" ON public.courses;
CREATE POLICY "Instructors and Admins can insert courses"
ON public.courses
FOR INSERT
WITH CHECK (
  public.get_user_role() = 'Admin'
  OR (
    public.get_user_role() = 'Instructor'
    AND instructor_id = auth.uid()
  )
);

-- 5) Scope assessment writes to course owners (or Admin).
DROP POLICY IF EXISTS "Instructors and Admins can insert assessments" ON public.assessments;
DROP POLICY IF EXISTS "Instructors and Admins can update assessments" ON public.assessments;
DROP POLICY IF EXISTS "Instructors and Admins can delete assessments" ON public.assessments;

CREATE POLICY "Instructors and Admins can insert assessments"
ON public.assessments
FOR INSERT
WITH CHECK (
  public.get_user_role() = 'Admin'
  OR (
    public.get_user_role() = 'Instructor'
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.course_id = assessments.course_id
        AND c.instructor_id = auth.uid()
    )
  )
);

CREATE POLICY "Instructors and Admins can update assessments"
ON public.assessments
FOR UPDATE
USING (
  public.get_user_role() = 'Admin'
  OR (
    public.get_user_role() = 'Instructor'
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.course_id = assessments.course_id
        AND c.instructor_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.get_user_role() = 'Admin'
  OR (
    public.get_user_role() = 'Instructor'
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.course_id = assessments.course_id
        AND c.instructor_id = auth.uid()
    )
  )
);

CREATE POLICY "Instructors and Admins can delete assessments"
ON public.assessments
FOR DELETE
USING (
  public.get_user_role() = 'Admin'
  OR (
    public.get_user_role() = 'Instructor'
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.course_id = assessments.course_id
        AND c.instructor_id = auth.uid()
    )
  )
);
