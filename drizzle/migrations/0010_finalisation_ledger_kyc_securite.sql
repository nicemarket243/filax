
-- Profils
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS middle_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Colonnes sensibles protégées contre la modification par l'utilisateur
CREATE OR REPLACE FUNCTION public.protect_profile_columns() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND COALESCE(current_setting('filax.kyc_write', true), '') <> '1' THEN
    NEW.kyc_status := OLD.kyc_status;
    NEW.kyc_validated_at := OLD.kyc_validated_at;
    NEW.filax_id := OLD.filax_id;
    NEW.is_demo := OLD.is_demo;
    NEW.user_id := OLD.user_id;
    NEW.id_document_path := OLD.id_document_path;
    NEW.id_document_type := OLD.id_document_type;
    NEW.selfie_path := OLD.selfie_path;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_protect_columns ON public.profiles;
CREATE TRIGGER profiles_protect_columns BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

CREATE OR REPLACE FUNCTION public.submit_kyc(_doc_type text, _doc_path text, _selfie_path text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF _doc_type NOT IN ('cni','passeport','permis') THEN RAISE EXCEPTION 'Type de pièce invalide'; END IF;
  IF _doc_path IS NULL OR _selfie_path IS NULL OR split_part(_doc_path,'/',1) <> auth.uid()::text OR split_part(_selfie_path,'/',1) <> auth.uid()::text THEN RAISE EXCEPTION 'Documents manquants'; END IF;
  PERFORM set_config('filax.kyc_write','1',true);
  UPDATE public.profiles SET id_document_type=_doc_type, id_document_path=_doc_path, selfie_path=_selfie_path, kyc_status='pending', kyc_validated_at=NULL
  WHERE user_id = auth.uid() AND kyc_status <> 'verified';
  PERFORM set_config('filax.kyc_write','',true);
END $$;

CREATE OR REPLACE FUNCTION public.submit_selfie(_selfie_path text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR _selfie_path IS NULL OR split_part(_selfie_path,'/',1) <> auth.uid()::text THEN RAISE EXCEPTION 'Selfie invalide'; END IF;
  PERFORM set_config('filax.kyc_write','1',true);
  UPDATE public.profiles SET selfie_path=_selfie_path, kyc_status = CASE WHEN id_document_path IS NOT NULL THEN 'pending' ELSE kyc_status END
  WHERE user_id = auth.uid() AND kyc_status <> 'verified';
  PERFORM set_config('filax.kyc_write','',true);
END $$;
GRANT EXECUTE ON FUNCTION public.submit_selfie(text) TO authenticated;

-- Journal d'audit
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  action text NOT NULL,
  target text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.write_audit(_action text, _target text, _details jsonb) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  INSERT INTO public.audit_log(actor, action, target, details) VALUES (auth.uid(), _action, _target, COALESCE(_details,'{}'::jsonb));
$$;
REVOKE EXECUTE ON FUNCTION public.write_audit(text,text,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_decide_kyc(_user uuid, _approved boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  PERFORM set_config('filax.kyc_write','1',true);
  UPDATE public.profiles SET kyc_status = CASE WHEN _approved THEN 'verified' ELSE 'rejected' END,
    kyc_validated_at = CASE WHEN _approved THEN now() ELSE NULL END
  WHERE user_id = _user AND kyc_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucune demande en attente'; END IF;
  PERFORM set_config('filax.kyc_write','',true);
  PERFORM public.write_audit(CASE WHEN _approved THEN 'kyc_approved' ELSE 'kyc_rejected' END, _user::text, '{}'::jsonb);
  INSERT INTO public.notifications(user_id, title, body) VALUES (_user,
    CASE WHEN _approved THEN 'Identité vérifiée' ELSE 'Vérification refusée' END,
    CASE WHEN _approved THEN 'Votre identité a été validée. Toutes les fonctionnalités sont débloquées.' ELSE 'Vos documents ont été refusés, merci de recommencer.' END);
END $$;

-- L'ancienne fonction sans contrôle admin devient réservée aux admins
CREATE OR REPLACE FUNCTION public.validate_kyc(_user uuid, _approved boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.admin_decide_kyc(_user, _approved); END $$;

-- KYC requis pour l'argent
CREATE OR REPLACE FUNCTION public.kyc_ok(_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=_user AND (kyc_status='verified' OR is_demo))
$$;
CREATE OR REPLACE FUNCTION public.require_kyc() RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.kyc_ok(auth.uid()) THEN RAISE EXCEPTION 'Identité non vérifiée : validez votre KYC pour effectuer cette opération'; END IF;
END $$;

-- Sorties d'argent : KYC + code du sous-compte
CREATE OR REPLACE FUNCTION public.guard_account_outflow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.balance < OLD.balance THEN
    IF NEW.balance < 0 THEN RAISE EXCEPTION 'Votre montant de retrait est supérieur au solde disponible sur ce compte.'; END IF;
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND NOT public.kyc_ok(OLD.user_id) THEN
      RAISE EXCEPTION 'Identité non vérifiée : validez votre KYC pour effectuer cette opération';
    END IF;
    IF EXISTS(SELECT 1 FROM public.account_security WHERE account_id=OLD.id) AND COALESCE(current_setting('filax.authorized_account',true),'')<>OLD.id::text AND COALESCE(current_setting('filax.admin_op',true),'')<>'1' THEN
      RAISE EXCEPTION 'Code du sous-compte requis';
    END IF;
  END IF;
  IF OLD.kind = 'main' AND NEW.status <> 'active' THEN RAISE EXCEPTION 'Les Comptes Principaux ne peuvent pas être bloqués'; END IF;
  IF NEW.kind <> OLD.kind OR NEW.user_id <> OLD.user_id OR NEW.currency <> OLD.currency THEN RAISE EXCEPTION 'Modification interdite'; END IF;
  IF OLD.locked_until IS NOT NULL AND (NEW.locked_until IS NULL OR NEW.locked_until < OLD.locked_until) THEN RAISE EXCEPTION 'Déblocage anticipé interdit'; END IF;
  RETURN NEW;
END $$;

-- Comptes : plus d'insertion directe depuis le navigateur
DROP POLICY IF EXISTS "own accounts create" ON public.accounts;
REVOKE INSERT, UPDATE, DELETE ON public.accounts FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(_account uuid, _status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _status NOT IN ('active','blocked') THEN RAISE EXCEPTION 'Statut invalide'; END IF;
  IF EXISTS(SELECT 1 FROM public.accounts WHERE id=_account AND kind='main') AND _status<>'active' THEN RAISE EXCEPTION 'Les Comptes Principaux ne peuvent pas être bloqués'; END IF;
  UPDATE public.accounts SET status=_status WHERE id=_account AND user_id<>auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable ou protégé'; END IF;
  PERFORM public.write_audit('account_status', _account::text, jsonb_build_object('status',_status));
END $$;

-- Sous-comptes : KYC, limite 10, blocage 7 jours à 5 ans
CREATE OR REPLACE FUNCTION public.create_subaccount(_parent uuid, _name text, _target numeric, _pin text, _visual text, _locked_until timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
DECLARE p public.accounts; aid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 PERFORM public.require_kyc();
 SELECT * INTO p FROM public.accounts WHERE id=_parent AND user_id=auth.uid() AND kind='main' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choisissez votre Compte Principal'; END IF;
 IF (SELECT count(*) FROM public.accounts WHERE user_id=auth.uid() AND kind<>'main') >= 10 THEN RAISE EXCEPTION 'Limite atteinte : 10 sous-comptes maximum'; END IF;
 IF length(trim(_name)) NOT BETWEEN 2 AND 80 OR _target IS NULL OR _target <= 0 OR _target > 1000000000000 OR _target::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Nom ou objectif invalide'; END IF;
 IF _pin IS NULL OR _pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'Code dédié : 4 chiffres requis'; END IF;
 IF _visual IS NULL OR NOT public.valid_account_visual(_visual) THEN RAISE EXCEPTION 'Visuel invalide'; END IF;
 IF _locked_until IS NOT NULL AND (_locked_until < now() + interval '7 days' - interval '1 hour' OR _locked_until > now() + interval '5 years' + interval '1 day') THEN RAISE EXCEPTION 'Durée de blocage : entre 7 jours et 5 ans'; END IF;
 INSERT INTO public.accounts(user_id,name,kind,currency,parent_account_id,target,visual_key,locked_until,has_dedicated_pin) VALUES(auth.uid(),trim(_name),CASE WHEN _locked_until IS NULL THEN 'savings' ELSE 'locked' END,p.currency,p.id,_target,_visual,_locked_until,true) RETURNING id INTO aid;
 INSERT INTO public.account_security VALUES(aid,crypt(_pin,gen_salt('bf',10)));
 RETURN aid;
END $$;

-- Transactions : états + idempotence
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS failure_reason text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check CHECK (status IN ('created','pending','confirmed','failed','refunded'));
CREATE UNIQUE INDEX IF NOT EXISTS transactions_idem_uniq ON public.transactions(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Limitation des essais de code
CREATE TABLE public.pin_attempts (
  user_id uuid PRIMARY KEY,
  failures integer NOT NULL DEFAULT 0,
  locked_until timestamptz
);
GRANT ALL ON public.pin_attempts TO service_role;
ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pin_failure() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.pin_attempts(user_id, failures) VALUES (auth.uid(), 1)
  ON CONFLICT (user_id) DO UPDATE SET failures = pin_attempts.failures + 1;
  UPDATE public.pin_attempts SET locked_until = now() + interval '15 minutes', failures = 0 WHERE user_id = auth.uid() AND failures >= 5;
END $$;
REVOKE EXECUTE ON FUNCTION public.pin_failure() FROM PUBLIC, anon, authenticated;

-- Dépôt : demande en attente, jamais de crédit direct
CREATE OR REPLACE FUNCTION public.request_deposit(_account uuid, _amount numeric, _method text, _idempotency_key text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE acc public.accounts; tx uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  PERFORM public.require_kyc();
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000000000000 OR _amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF _method NOT IN ('orange','airtel','mpesa','banque','carte','filax') THEN RAISE EXCEPTION 'Moyen invalide'; END IF;
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO tx FROM public.transactions WHERE user_id=auth.uid() AND idempotency_key=_idempotency_key;
    IF FOUND THEN RETURN tx; END IF;
  END IF;
  SELECT * INTO acc FROM public.accounts WHERE id=_account AND user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  IF acc.status <> 'active' THEN RAISE EXCEPTION 'Compte bloqué'; END IF;
  INSERT INTO public.transactions(user_id, account_id, type, amount, method, label, status, idempotency_key)
  VALUES (auth.uid(), _account, 'deposit', _amount, _method, 'Dépôt ' || _method, 'pending', left(_idempotency_key,80)) RETURNING id INTO tx;
  INSERT INTO public.notifications(user_id, title, body) VALUES (auth.uid(), 'Dépôt en attente', _amount || ' ' || acc.currency || ' en attente de confirmation du paiement');
  RETURN tx;
END $$;
GRANT EXECUTE ON FUNCTION public.request_deposit(uuid,numeric,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.deposit(_account uuid, _amount numeric, _method text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN RETURN public.request_deposit(_account, _amount, _method, NULL); END $$;

-- Fonctions internes : seulement via account_outflow
REVOKE EXECUTE ON FUNCTION public.withdraw(uuid,numeric,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transfer(uuid,text,numeric,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transfer_external(uuid,numeric,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fund_goal(uuid,uuid,numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.contribute(uuid,uuid,numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_pin(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_kyc(uuid,boolean) FROM PUBLIC, anon;

DROP FUNCTION IF EXISTS public.account_outflow(uuid,text,numeric,text,text,text,uuid);
CREATE FUNCTION public.account_outflow(_account uuid, _operation text, _amount numeric, _pin text DEFAULT '', _global_pin text DEFAULT '', _destination text DEFAULT '', _related uuid DEFAULT NULL, _idempotency_key text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
DECLARE a public.accounts; h text; tx uuid; lk timestamptz; needs_global boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 PERFORM public.require_kyc();
 IF _amount IS NULL OR _amount<=0 OR _amount>1000000000000 OR _amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Montant invalide'; END IF;
 IF _idempotency_key IS NOT NULL THEN
   SELECT id INTO tx FROM public.transactions WHERE user_id=auth.uid() AND idempotency_key=_idempotency_key;
   IF FOUND THEN RETURN jsonb_build_object('ok',true,'transaction_id',tx,'duplicate',true); END IF;
 END IF;
 SELECT locked_until INTO lk FROM public.pin_attempts WHERE user_id=auth.uid();
 IF lk IS NOT NULL AND lk > now() THEN RAISE EXCEPTION 'Trop d''essais de code : réessayez dans 15 minutes'; END IF;
 SELECT * INTO a FROM public.accounts WHERE id=_account AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
 IF a.status<>'active' THEN RAISE EXCEPTION 'Compte bloqué'; END IF;
 IF a.locked_until IS NOT NULL AND a.locked_until>now() THEN RAISE EXCEPTION 'Fonds bloqués jusqu''au %', to_char(a.locked_until,'DD/MM/YYYY'); END IF;
 IF a.balance < _amount THEN RAISE EXCEPTION 'Votre montant de retrait est supérieur au solde disponible sur ce compte.'; END IF;
 SELECT pin_hash INTO h FROM public.account_security WHERE account_id=a.id;
 IF h IS NOT NULL AND (_pin IS NULL OR _pin !~ '^[0-9]{4}$' OR crypt(_pin,h)<>h) THEN
   PERFORM public.pin_failure();
   RETURN jsonb_build_object('ok',false,'error','Code du sous-compte incorrect');
 END IF;
 needs_global := _operation IN ('transfer','external');
 IF needs_global AND NOT public.check_pin(_global_pin) THEN
   PERFORM public.pin_failure();
   RETURN jsonb_build_object('ok',false,'error','Code secret incorrect');
 END IF;
 DELETE FROM public.pin_attempts WHERE user_id=auth.uid();
 PERFORM set_config('filax.authorized_account',a.id::text,true);
 CASE _operation
 WHEN 'withdraw' THEN
   IF _destination NOT IN ('orange','airtel','mpesa','banque','carte','filax') THEN RAISE EXCEPTION 'Moyen invalide'; END IF;
   tx:=public.withdraw(a.id,_amount,_destination);
 WHEN 'transfer' THEN
   IF _destination IS NULL OR length(_destination)>30 OR _destination !~ '^FLX-[A-Z0-9-]+$' THEN RAISE EXCEPTION 'ID FILAX invalide'; END IF;
   tx:=public.transfer(a.id,_destination,_amount,_global_pin);
 WHEN 'external' THEN
   IF length(trim(_destination)) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Destinataire invalide'; END IF;
   tx:=public.transfer_external(a.id,_amount,_destination,_global_pin);
 WHEN 'goal' THEN PERFORM public.fund_goal(_related,a.id,_amount);
 WHEN 'contribute' THEN PERFORM public.contribute(_related,a.id,_amount);
 ELSE RAISE EXCEPTION 'Opération invalide';
 END CASE;
 PERFORM set_config('filax.authorized_account','',true);
 IF tx IS NOT NULL THEN
   UPDATE public.transactions SET confirmed_at=now(), idempotency_key=left(_idempotency_key,80) WHERE id=tx;
 END IF;
 RETURN jsonb_build_object('ok',true,'transaction_id',tx);
END $$;
GRANT EXECUTE ON FUNCTION public.account_outflow(uuid,text,numeric,text,text,text,uuid,text) TO authenticated;

-- Litiges
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id),
  reason text NOT NULL CHECK (length(reason) BETWEEN 5 AND 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','rejected')),
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own disputes read" ON public.disputes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own disputes create" ON public.disputes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status='open' AND resolution IS NULL AND (transaction_id IS NULL OR EXISTS(SELECT 1 FROM public.transactions t WHERE t.id=transaction_id AND t.user_id=auth.uid())));

-- Incidents (admin)
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  details text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read incidents" ON public.incidents FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Admin : opérations du ledger
CREATE OR REPLACE FUNCTION public.admin_list_transactions(_status text DEFAULT NULL) RETURNS TABLE(id uuid, user_id uuid, owner text, filax_id text, account text, currency text, type text, amount numeric, fee numeric, method text, label text, status text, failure_reason text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT t.id, t.user_id, coalesce(nullif(trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),''), p.email), p.filax_id, a.name, a.currency, t.type, t.amount, t.fee, t.method, t.label, t.status, t.failure_reason, t.created_at
  FROM public.transactions t JOIN public.accounts a ON a.id=t.account_id LEFT JOIN public.profiles p ON p.user_id=t.user_id
  WHERE _status IS NULL OR t.status=_status ORDER BY t.created_at DESC LIMIT 300;
END $$;

CREATE OR REPLACE FUNCTION public.admin_confirm_deposit(_tx uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.transactions; acc public.accounts;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO t FROM public.transactions WHERE id=_tx FOR UPDATE;
  IF NOT FOUND OR t.type<>'deposit' OR t.status<>'pending' THEN RAISE EXCEPTION 'Dépôt non en attente'; END IF;
  UPDATE public.accounts SET balance=balance+t.amount WHERE id=t.account_id RETURNING * INTO acc;
  UPDATE public.transactions SET status='confirmed', confirmed_at=now() WHERE id=_tx;
  PERFORM public.write_audit('deposit_confirmed', _tx::text, jsonb_build_object('amount',t.amount,'currency',acc.currency));
  INSERT INTO public.notifications(user_id,title,body) VALUES (t.user_id,'Dépôt confirmé', t.amount||' '||acc.currency||' crédités sur '||acc.name);
END $$;

CREATE OR REPLACE FUNCTION public.admin_fail_transaction(_tx uuid, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.transactions;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO t FROM public.transactions WHERE id=_tx FOR UPDATE;
  IF NOT FOUND OR t.status NOT IN ('created','pending') THEN RAISE EXCEPTION 'Opération non en attente'; END IF;
  UPDATE public.transactions SET status='failed', failure_reason=left(coalesce(_reason,''),200) WHERE id=_tx;
  PERFORM public.write_audit('transaction_failed', _tx::text, jsonb_build_object('reason',_reason));
  INSERT INTO public.notifications(user_id,title,body) VALUES (t.user_id,'Opération échouée', coalesce(nullif(_reason,''),'Le paiement n''a pas été reçu.'));
END $$;

CREATE OR REPLACE FUNCTION public.admin_refund_transaction(_tx uuid, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.transactions; acc public.accounts;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO t FROM public.transactions WHERE id=_tx FOR UPDATE;
  IF NOT FOUND OR t.status<>'confirmed' OR t.type NOT IN ('withdraw','transfer_out','contribution') THEN RAISE EXCEPTION 'Seule une sortie confirmée peut être remboursée'; END IF;
  UPDATE public.accounts SET balance=balance+t.amount+t.fee WHERE id=t.account_id RETURNING * INTO acc;
  UPDATE public.transactions SET status='refunded', failure_reason=left(coalesce(_reason,''),200) WHERE id=_tx;
  INSERT INTO public.transactions(user_id,account_id,type,amount,method,label,status,confirmed_at)
  VALUES (t.user_id,t.account_id,'refund',t.amount+t.fee,'filax','Remboursement · '||coalesce(t.label,''),'confirmed',now());
  PERFORM public.write_audit('transaction_refunded', _tx::text, jsonb_build_object('amount',t.amount+t.fee,'reason',_reason));
  INSERT INTO public.notifications(user_id,title,body) VALUES (t.user_id,'Remboursement', (t.amount+t.fee)||' '||acc.currency||' recrédités sur '||acc.name);
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_disputes() RETURNS TABLE(id uuid, owner text, filax_id text, transaction_id uuid, tx_label text, tx_amount numeric, reason text, status text, resolution text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT d.id, coalesce(nullif(trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),''), p.email), p.filax_id, d.transaction_id, t.label, t.amount, d.reason, d.status, d.resolution, d.created_at
  FROM public.disputes d LEFT JOIN public.profiles p ON p.user_id=d.user_id LEFT JOIN public.transactions t ON t.id=d.transaction_id
  ORDER BY (d.status='open') DESC, d.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(_id uuid, _accepted boolean, _resolution text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d public.disputes;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  UPDATE public.disputes SET status=CASE WHEN _accepted THEN 'resolved' ELSE 'rejected' END, resolution=left(coalesce(_resolution,''),500), resolved_at=now()
  WHERE id=_id AND status='open' RETURNING * INTO d;
  IF NOT FOUND THEN RAISE EXCEPTION 'Litige introuvable ou déjà traité'; END IF;
  PERFORM public.write_audit('dispute_'||d.status, _id::text, jsonb_build_object('resolution',_resolution));
  INSERT INTO public.notifications(user_id,title,body) VALUES (d.user_id, CASE WHEN _accepted THEN 'Litige résolu' ELSE 'Litige refusé' END, coalesce(nullif(_resolution,''),'Votre réclamation a été traitée.'));
END $$;

CREATE OR REPLACE FUNCTION public.admin_create_incident(_title text, _severity text, _details text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE i uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF length(trim(coalesce(_title,''))) NOT BETWEEN 3 AND 120 THEN RAISE EXCEPTION 'Titre invalide'; END IF;
  INSERT INTO public.incidents(title,severity,details,created_by) VALUES (trim(_title), coalesce(nullif(_severity,''),'medium'), left(_details,2000), auth.uid()) RETURNING id INTO i;
  PERFORM public.write_audit('incident_created', i::text, jsonb_build_object('title',_title,'severity',_severity));
  RETURN i;
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_incident(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  UPDATE public.incidents SET status='resolved', resolved_at=now() WHERE id=_id AND status='open';
  IF NOT FOUND THEN RAISE EXCEPTION 'Incident introuvable'; END IF;
  PERFORM public.write_audit('incident_resolved', _id::text, '{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.admin_reconciliation() RETURNS TABLE(currency text, total_balance numeric, ledger_net numeric, gap numeric, pending_count bigint, pending_amount numeric, fees numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  WITH led AS (
    SELECT a.currency AS cur, sum(CASE
      WHEN t.status NOT IN ('confirmed','refunded') THEN 0
      WHEN t.type IN ('deposit','transfer_in','refund') THEN t.amount
      WHEN t.type = 'group_withdraw' THEN t.amount - t.fee
      ELSE -(t.amount + t.fee) END) AS net
    FROM public.transactions t JOIN public.accounts a ON a.id=t.account_id GROUP BY a.currency),
  bal AS (SELECT a.currency AS cur, sum(a.balance) AS b FROM public.accounts a GROUP BY a.currency),
  pen AS (SELECT a.currency AS cur, count(*) AS c, sum(t.amount) AS s FROM public.transactions t JOIN public.accounts a ON a.id=t.account_id WHERE t.status='pending' GROUP BY a.currency),
  fee AS (SELECT f.currency AS cur, sum(f.amount) AS s FROM public.platform_fees f GROUP BY f.currency)
  SELECT bal.cur, bal.b, coalesce(led.net,0), bal.b - coalesce(led.net,0), coalesce(pen.c,0), coalesce(pen.s,0), coalesce(fee.s,0)
  FROM bal LEFT JOIN led ON led.cur=bal.cur LEFT JOIN pen ON pen.cur=bal.cur LEFT JOIN fee ON fee.cur=bal.cur;
END $$;

-- Inscription : post-nom et e-mail
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE fid text := 'FLX-' || upper(substr(replace(NEW.id::text,'-',''),1,8));
BEGIN
  INSERT INTO public.profiles (user_id, first_name, middle_name, last_name, birth_date, birth_city, email, phone, partner_bank, filax_id, username, partner_subaccount)
  VALUES (
    NEW.id,
    left(NEW.raw_user_meta_data ->> 'first_name', 80),
    left(NEW.raw_user_meta_data ->> 'middle_name', 80),
    left(NEW.raw_user_meta_data ->> 'last_name', 80),
    (NULLIF(NEW.raw_user_meta_data ->> 'birth_date', ''))::DATE,
    NEW.raw_user_meta_data ->> 'birth_city',
    COALESCE(NEW.email, left(NEW.raw_user_meta_data ->> 'contact_email', 255)),
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone'),
    COALESCE(NEW.raw_user_meta_data ->> 'partner_bank', 'TMB'),
    fid, lower(fid),
    COALESCE(NEW.raw_user_meta_data ->> 'partner_bank', 'TMB') || '-' || substr(replace(NEW.id::text,'-',''),9,10)
  ) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.accounts(user_id, name, kind, currency) VALUES
    (NEW.id, 'Compte Principal USD', 'main', 'USD'),
    (NEW.id, 'Compte Principal CDF', 'main', 'CDF');
  RETURN NEW;
END $$;
