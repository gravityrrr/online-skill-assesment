-- =============================================
-- FIX: Infinite recursion in users RLS policies
-- =============================================

-- Step 1: Create a SECURITY DEFINER helper that bypasses RLS to check approval
CREATE OR REPLACE FUNCTION public.is_approved_instructor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'Instructor'
      AND is_approved = true
  );
$$;

-- Step 2: Replace the broken recursive policy with one that uses the safe helper
DROP POLICY IF EXISTS "Instructors and Admins can read all users" ON public.users;

CREATE POLICY "Instructors and Admins can read all users"
ON public.users
FOR SELECT
USING (
  public.get_user_role() = 'Admin'
  OR public.is_approved_instructor()
);
