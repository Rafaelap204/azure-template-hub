CREATE OR REPLACE FUNCTION public.restrict_auth_user_creation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL OR lower(NEW.email) <> 'admgestalt@gmail.com' THEN
    RAISE EXCEPTION 'SIGNUP_DISABLED';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'restrict_auth_user_creation'
  ) THEN
    CREATE TRIGGER restrict_auth_user_creation
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.restrict_auth_user_creation();
  END IF;
END $$;
