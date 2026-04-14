-- Create a trigger function to automatically create a row in public.users when a user signs up.
-- This ensures our RLS and foreign-key system in public schema instantly recognizes the new player.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', 'Unknown Learner'),
    'Learner'::public.user_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map the Postgres Trigger to fire immediately ON INSERT into the isolated Supabase auth.users table.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
