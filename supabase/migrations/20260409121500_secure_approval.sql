-- Inject strict verification metrics blocking unauthorized personnel securely natively
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

-- Ensure Instructors injected via backend trigger physically boot unapproved natively explicitly blocking Dashboard escalation naturally
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  extracted_role public.user_role;
  approval_status BOOLEAN;
BEGIN
  extracted_role := COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'Learner'::public.user_role);
  
  -- Core Auto-Validation constraints preventing manual intervention for massive public student pools securely natively
  IF extracted_role = 'Learner' THEN
    approval_status := true;
  ELSE
    -- Instructors explicitly mandate Admin Validation protocols preventing hacker manipulation securely naturally
    approval_status := false;
  END IF;

  INSERT INTO public.users (id, email, name, role, is_approved)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', 'Unknown User'),
    extracted_role,
    approval_status
  )
  ON CONFLICT (id) DO UPDATE SET 
    role = EXCLUDED.role,
    is_approved = EXCLUDED.is_approved;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Absolute Security Granularity explicitly revoking Update privileges restricting Instructors from hacking their own approval constraints natively.
REVOKE UPDATE (role, is_approved) ON public.users FROM authenticated;
