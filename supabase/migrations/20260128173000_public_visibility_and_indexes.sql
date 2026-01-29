CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  public_access_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS singleton BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS public_access_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS app_settings_singleton_uidx
ON public.app_settings (singleton);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_app_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.templates') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS templates_user_id_updated_at_idx ON public.templates (user_id, updated_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS templates_based_on_template_id_idx ON public.templates (based_on_template_id)';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.user_sessions') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_sessions'
        AND column_name = 'login_at'
    )
  THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS user_sessions_user_id_login_at_idx ON public.user_sessions (user_id, login_at DESC)';
  END IF;
END $$;

INSERT INTO public.app_settings (singleton, public_access_enabled)
VALUES (true, false)
ON CONFLICT (singleton) DO NOTHING;
