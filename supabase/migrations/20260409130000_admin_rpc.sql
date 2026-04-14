CREATE OR REPLACE FUNCTION public.approve_instructor(target_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Strict Backend Firewall Context: Validates execution context intrinsically securing RPC native layouts structurally.
  IF (SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin' THEN
    UPDATE public.users SET is_approved = true WHERE id = target_user_id AND role = 'Instructor';
  ELSE
    RAISE EXCEPTION 'Unauthorized Firewall Intercepted Request: Only personnel with absolute Administrator Security can authenticate instructors.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
