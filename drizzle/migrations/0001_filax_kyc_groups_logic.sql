-- KYC: soumission sécurisée (l'utilisateur ne peut pas se valider lui-même)
CREATE OR REPLACE FUNCTION public.submit_kyc(_doc_type text, _doc_path text, _selfie_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF _doc_type NOT IN ('cni','passeport','permis') THEN RAISE EXCEPTION 'Type de pièce invalide'; END IF;
  IF _doc_path IS NULL OR _selfie_path IS NULL THEN RAISE EXCEPTION 'Documents manquants'; END IF;
  UPDATE public.profiles
  SET id_document_type = _doc_type,
      id_document_path = _doc_path,
      selfie_path = _selfie_path,
      kyc_status = 'pending',
      kyc_validated_at = NULL
  WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
END
$fn$;

-- KYC: validation (réservée au service / back-office, jamais au client)
CREATE OR REPLACE FUNCTION public.validate_kyc(_user uuid, _approved boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  UPDATE public.profiles
  SET kyc_status = CASE WHEN _approved THEN 'verified' ELSE 'rejected' END,
      kyc_validated_at = CASE WHEN _approved THEN now() ELSE NULL END
  WHERE user_id = _user;
END
$fn$;
REVOKE ALL ON FUNCTION public.validate_kyc(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_kyc(uuid, boolean) TO service_role;

-- Groupes: inviter un membre par son username ou FILAX-ID (propriétaire uniquement)
CREATE OR REPLACE FUNCTION public.invite_to_group(_group uuid, _identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE target uuid; gname text; who text;
BEGIN
  SELECT name INTO gname FROM public.groups WHERE id = _group AND owner_id = auth.uid();
  IF gname IS NULL THEN RAISE EXCEPTION 'Groupe introuvable ou non autorisé'; END IF;
  SELECT user_id INTO target FROM public.profiles
  WHERE username = lower(_identifier) OR filax_id = upper(_identifier);
  IF target IS NULL THEN RAISE EXCEPTION 'Utilisateur introuvable'; END IF;
  IF target = auth.uid() THEN RAISE EXCEPTION 'Vous êtes déjà le propriétaire'; END IF;
  INSERT INTO public.group_members(group_id, user_id) VALUES (_group, target)
  ON CONFLICT (group_id, user_id) DO NOTHING;
  SELECT trim(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO who FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.notifications(user_id, title, body)
  VALUES (target, 'Invitation à un groupe', COALESCE(who,'Un membre') || ' vous a ajouté au groupe ' || gname);
  RETURN target::text;
END
$fn$;

-- Groupes: quitter un groupe (membre uniquement, pas le propriétaire)
CREATE OR REPLACE FUNCTION public.leave_group(_group uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF EXISTS (SELECT 1 FROM public.groups WHERE id = _group AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Le propriétaire ne peut pas quitter son groupe';
  END IF;
  DELETE FROM public.group_members WHERE group_id = _group AND user_id = auth.uid();
END
$fn$;

-- group_members: autoriser la suppression via leave_group (SECURITY DEFINER, RLS contournée)
-- mais le propriétaire doit pouvoir retirer un membre:
CREATE POLICY "owner removes members" ON public.group_members
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()));

-- group_contributions: lecture des noms des membres pour l'affichage (via contribute, déjà inséré)
-- Storage: politiques du bucket kyc-documents (chaque utilisateur gère son dossier)
CREATE POLICY "kyc upload own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc read own folder" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc update own folder" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc delete own folder" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);