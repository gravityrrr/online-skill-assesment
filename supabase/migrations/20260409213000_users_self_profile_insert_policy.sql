-- Allows authenticated users to bootstrap their own non-admin profile row safely.

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT
WITH CHECK (
  auth.uid() = id
  AND role IN ('Learner', 'Instructor')
  AND (
    (role = 'Learner' AND is_approved = true AND approval_state = 'approved')
    OR (role = 'Instructor' AND is_approved = false AND approval_state = 'pending')
  )
);

REVOKE UPDATE (role, is_approved, approval_state) ON public.users FROM authenticated;
