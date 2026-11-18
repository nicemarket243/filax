ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_filax_id_unique ON public.profiles(filax_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fid text;
  initials text;
  digits integer;
  first_name_text text;
  last_name_text text;
BEGIN
  first_name_text := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'first_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'given_name', ''),
    'X'
  );
  last_name_text := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'last_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'family_name', ''),
    'X'
  );
  initials := upper(left(last_name_text, 1)) || upper(left(first_name_text, 1));
  initials := translate(initials, 'ÀÁÂÄÃÅÇÈÉÊËÌÍÎÏÑÒÓÔÖÕÙÚÛÜÝ', 'AAAAAACEEEEIIIINOOOOOOUUUUY');
  IF initials !~ '^[A-Z]{2}$' THEN initials := 'XX'; END IF;

  -- Serialize allocation per initials so simultaneous signups cannot reserve the same public ID.
  PERFORM pg_advisory_xact_lock(hashtext(initials));
  digits := (('x' || substr(md5(NEW.id::text), 1, 8))::bit(32)::bigint % 10000)::integer;
  fid := 'FLX-' || lpad(digits::text, 4, '0') || '-' || initials;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE filax_id = fid) LOOP
    digits := (digits + 1) % 10000;
    fid := 'FLX-' || lpad(digits::text, 4, '0') || '-' || initials;
  END LOOP;

  INSERT INTO public.profiles (
    user_id, first_name, middle_name, last_name, birth_date, birth_city,
    email, phone, country, partner_bank, filax_id, username, partner_subaccount
  ) VALUES (
    NEW.id,
    left(first_name_text, 80),
    left(NEW.raw_user_meta_data ->> 'middle_name', 80),
    left(last_name_text, 80),
    (NULLIF(NEW.raw_user_meta_data ->> 'birth_date', ''))::DATE,
    NEW.raw_user_meta_data ->> 'birth_city',
    COALESCE(NEW.email, left(NEW.raw_user_meta_data ->> 'contact_email', 255)),
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone'),
    COALESCE(NEW.raw_user_meta_data ->> 'country', 'CD'),
    COALESCE(NEW.raw_user_meta_data ->> 'partner_bank', 'TMB'),
    fid,
    lower(fid),
    COALESCE(NEW.raw_user_meta_data ->> 'partner_bank', 'TMB') || '-' || substr(replace(NEW.id::text, '-', ''), 9, 10)
  ) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.accounts (
    user_id, name, kind, currency, balance,
    available_balance, reserved_balance, pending_incoming, pending_outgoing
  ) VALUES
    (NEW.id, 'Compte Principal USD', 'main', 'USD', 0, 0, 0, 0, 0),
    (NEW.id, 'Compte Principal CDF', 'main', 'CDF', 0, 0, 0, 0, 0);
  RETURN NEW;
END
$function$;

CREATE POLICY "Users can read their own avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can replace their own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);