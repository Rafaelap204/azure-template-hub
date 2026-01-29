CREATE OR REPLACE FUNCTION public.is_public_access_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    CASE
      WHEN to_regclass('public.app_settings') IS NULL THEN false
      ELSE COALESCE((SELECT public_access_enabled FROM public.app_settings LIMIT 1), false)
    END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
  SELECT lower(
    COALESCE(
      auth.jwt() ->> 'email',
      current_setting('request.jwt.claim.email', true),
      ''
    )
  ) = 'admgestalt@gmail.com';
$$;

DROP POLICY IF EXISTS "Admin can read app settings" ON public.app_settings;
CREATE POLICY "Admin can read app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can update app settings" ON public.app_settings;
CREATE POLICY "Admin can update app settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can insert app settings" ON public.app_settings;
CREATE POLICY "Admin can insert app settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DO $$
BEGIN
  IF to_regclass('public.templates') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public can view templates when public access enabled" ON public.templates';
    EXECUTE 'CREATE POLICY "Public can view templates when public access enabled" ON public.templates FOR SELECT TO anon USING (public.is_public_access_enabled())';
  END IF;
END $$;
