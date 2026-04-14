-- Adds explicit instructor approval lifecycle and reject RPC.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS approval_state TEXT;

UPDATE public.users
SET approval_state = CASE
  WHEN role = 'Instructor' AND is_approved = true THEN 'approved'
  WHEN role = 'Instructor' AND is_approved = false THEN 'pending'
  ELSE 'approved'
END
WHERE approval_state IS NULL;

ALTER TABLE public.users
ALTER COLUMN approval_state SET DEFAULT 'approved';

ALTER TABLE public.users
ALTER COLUMN approval_state SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_approval_state_check'
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_approval_state_check
    CHECK (approval_state IN ('pending', 'approved', 'rejected'));
  END IF;
END
$$;

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
  approval_state_value TEXT;
BEGIN
  requested_role := COALESCE(new.raw_user_meta_data->>'role', 'Learner');

  IF requested_role = 'Instructor' THEN
    extracted_role := 'Instructor'::public.user_role;
    approval_status := false;
    approval_state_value := 'pending';
  ELSE
    extracted_role := 'Learner'::public.user_role;
    approval_status := true;
    approval_state_value := 'approved';
  END IF;

  INSERT INTO public.users (id, email, name, role, is_approved, approval_state)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Unknown User'),
    extracted_role,
    approval_status,
    approval_state_value
  )
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      is_approved = EXCLUDED.is_approved,
      approval_state = EXCLUDED.approval_state,
      name = EXCLUDED.name,
      email = EXCLUDED.email;

  RETURN new;
END;
$$;

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
  SET is_approved = true,
      approval_state = 'approved'
  WHERE id = target_user_id
    AND role = 'Instructor';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user is not an Instructor or does not exist';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_instructor(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM public.users WHERE id = auth.uid()) <> 'Admin' THEN
    RAISE EXCEPTION 'Only Admin can reject instructors';
  END IF;

  UPDATE public.users
  SET is_approved = false,
      approval_state = 'rejected'
  WHERE id = target_user_id
    AND role = 'Instructor';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user is not an Instructor or does not exist';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_instructor(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_instructor(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.reject_instructor(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reject_instructor(UUID) TO authenticated;
