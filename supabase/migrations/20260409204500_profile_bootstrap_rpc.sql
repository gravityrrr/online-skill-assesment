-- Ensures an authenticated user always has a corresponding public.users row.

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user auth.users%ROWTYPE;
  requested_role TEXT;
  target_role public.user_role;
  target_approved BOOLEAN;
  target_state TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO auth_user
  FROM auth.users
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user not found';
  END IF;

  requested_role := COALESCE(auth_user.raw_user_meta_data->>'role', 'Learner');

  IF requested_role = 'Instructor' THEN
    target_role := 'Instructor'::public.user_role;
    target_approved := false;
    target_state := 'pending';
  ELSE
    target_role := 'Learner'::public.user_role;
    target_approved := true;
    target_state := 'approved';
  END IF;

  INSERT INTO public.users (id, email, name, role, is_approved, approval_state)
  VALUES (
    auth_user.id,
    auth_user.email,
    COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1)),
    target_role,
    target_approved,
    target_state
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(public.users.name, EXCLUDED.name);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM anon;
REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;
