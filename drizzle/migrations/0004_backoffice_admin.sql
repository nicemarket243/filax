CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- KYC : lecture des dossiers par les admins
CREATE POLICY "admins read kyc docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_list_kyc()
RETURNS TABLE(user_id uuid, first_name text, last_name text, email text, filax_id text, id_document_type text, id_document_path text, selfie_path text, kyc_status text, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT p.user_id, p.first_name, p.last_name, p.email, p.filax_id, p.id_document_type, p.id_document_path, p.selfie_path, p.kyc_status, p.updated_at
  FROM public.profiles p WHERE p.kyc_status IN ('pending','verified','rejected') ORDER BY (p.kyc_status = 'pending') DESC, p.updated_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_decide_kyc(_user uuid, _approved boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  UPDATE public.profiles SET kyc_status = CASE WHEN _approved THEN 'verified' ELSE 'rejected' END,
    kyc_validated_at = CASE WHEN _approved THEN now() ELSE NULL END
  WHERE user_id = _user AND kyc_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucune demande en attente'; END IF;
  INSERT INTO public.notifications(user_id, title, body) VALUES (_user,
    CASE WHEN _approved THEN 'Identité vérifiée' ELSE 'Vérification refusée' END,
    CASE WHEN _approved THEN 'Votre identité a été validée.' ELSE 'Vos documents ont été refusés, merci de recommencer.' END);
END $$;

-- Retraits de groupe
CREATE TABLE public.group_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  amount numeric NOT NULL CHECK (amount > 0),
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
GRANT SELECT ON public.group_withdrawals TO authenticated;
GRANT ALL ON public.group_withdrawals TO service_role;
ALTER TABLE public.group_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read withdrawals" ON public.group_withdrawals FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.request_group_withdrawal(_group uuid, _account uuid, _amount numeric, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.groups; acc public.accounts; pend numeric; rid uuid;
BEGIN
  SELECT * INTO g FROM public.groups WHERE id = _group AND owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Seul le propriétaire peut demander un retrait'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE id = _account AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  IF acc.currency <> g.currency THEN RAISE EXCEPTION 'Devise différente du groupe'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  SELECT COALESCE(sum(amount),0) INTO pend FROM public.group_withdrawals WHERE group_id = _group AND status = 'pending';
  IF g.collected < _amount + pend THEN RAISE EXCEPTION 'Montant supérieur à la cagnotte disponible'; END IF;
  INSERT INTO public.group_withdrawals(group_id, requested_by, account_id, amount, reason)
  VALUES (_group, auth.uid(), _account, _amount, left(_reason, 200)) RETURNING id INTO rid;
  INSERT INTO public.notifications(user_id, title, body)
  SELECT m.user_id, 'Demande de retrait', 'Retrait de ' || _amount || ' ' || g.currency || ' demandé sur ' || g.name || ' — en attente de validation'
  FROM public.group_members m WHERE m.group_id = _group;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_withdrawals()
RETURNS TABLE(id uuid, group_name text, currency text, collected numeric, requester text, amount numeric, reason text, status text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT w.id, g.name, g.currency, g.collected,
    trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), w.amount, w.reason, w.status, w.created_at
  FROM public.group_withdrawals w JOIN public.groups g ON g.id = w.group_id
  LEFT JOIN public.profiles p ON p.user_id = w.requested_by
  ORDER BY (w.status = 'pending') DESC, w.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_decide_withdrawal(_id uuid, _approved boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.group_withdrawals; g public.groups; f numeric; tx uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO w FROM public.group_withdrawals WHERE id = _id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucune demande en attente'; END IF;
  SELECT * INTO g FROM public.groups WHERE id = w.group_id FOR UPDATE;
  IF NOT _approved THEN
    UPDATE public.group_withdrawals SET status = 'rejected', decided_at = now() WHERE id = _id;
    INSERT INTO public.notifications(user_id, title, body) VALUES (w.requested_by, 'Retrait refusé', 'Votre demande sur ' || g.name || ' a été refusée.');
    RETURN;
  END IF;
  IF g.collected < w.amount THEN RAISE EXCEPTION 'Cagnotte insuffisante'; END IF;
  f := public.filax_fee(w.amount);
  UPDATE public.groups SET collected = collected - w.amount WHERE id = g.id;
  UPDATE public.accounts SET balance = balance + w.amount - f WHERE id = w.account_id;
  UPDATE public.group_withdrawals SET status = 'approved', decided_at = now() WHERE id = _id;
  INSERT INTO public.transactions(user_id, account_id, type, amount, fee, method, label, counterparty)
  VALUES (w.requested_by, w.account_id, 'group_withdraw', w.amount, f, 'groupe', 'Retrait cagnotte ' || g.name, g.name) RETURNING id INTO tx;
  INSERT INTO public.platform_fees(transaction_id, amount, currency) VALUES (tx, f, g.currency);
  INSERT INTO public.notifications(user_id, title, body)
  SELECT m.user_id, 'Retrait validé', w.amount || ' ' || g.currency || ' retirés de ' || g.name
  FROM public.group_members m WHERE m.group_id = g.id;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_kyc() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_decide_kyc(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_group_withdrawal(uuid, uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_withdrawals() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_decide_withdrawal(uuid, boolean) FROM anon;