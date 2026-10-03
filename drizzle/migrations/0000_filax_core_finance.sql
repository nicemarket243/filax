CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS filax_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS partner_bank text,
  ADD COLUMN IF NOT EXISTS partner_subaccount text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'CD',
  ADD COLUMN IF NOT EXISTS two_factor boolean NOT NULL DEFAULT false;

-- PIN stored hashed in a separate table, never readable by clients
CREATE TABLE public.user_security (
  user_id uuid PRIMARY KEY,
  pin_hash text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_security TO service_role;
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'main', -- main | savings | locked
  currency text NOT NULL DEFAULT 'USD',
  balance numeric(14,2) NOT NULL DEFAULT 0,
  locked_until timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own accounts read" ON public.accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own accounts create" ON public.accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND balance = 0);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  type text NOT NULL, -- deposit | withdraw | transfer_in | transfer_out | contribution
  amount numeric(14,2) NOT NULL,
  fee numeric(14,2) NOT NULL DEFAULT 0,
  method text,
  label text,
  counterparty text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx read" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.platform_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.platform_fees TO service_role;
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Famille',
  currency text NOT NULL DEFAULT 'USD',
  target numeric(14,2),
  collected numeric(14,2) NOT NULL DEFAULT 0,
  deadline date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE TABLE public.group_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contributor_name text,
  amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.groups TO authenticated;
GRANT SELECT, INSERT ON public.group_members TO authenticated;
GRANT SELECT ON public.group_contributions TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.groups, public.group_members, public.group_contributions, public.notifications TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group AND user_id = _user)
$$;

CREATE POLICY "members read groups" ON public.groups FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_group_member(id, auth.uid()));
CREATE POLICY "create own group" ON public.groups FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND collected = 0);
CREATE POLICY "members read members" ON public.group_members FOR SELECT TO authenticated USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "owner adds members" ON public.group_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));
CREATE POLICY "members read contributions" ON public.group_contributions FOR SELECT TO authenticated USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "mark own read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Fee: 0.5%, minimum 0.10
CREATE OR REPLACE FUNCTION public.filax_fee(_amount numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT GREATEST(round(_amount * 0.005, 2), 0.10)
$$;

CREATE OR REPLACE FUNCTION public.set_pin(_pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF _pin !~ '^\d{4}$' THEN RAISE EXCEPTION 'PIN invalide'; END IF;
  INSERT INTO public.user_security(user_id, pin_hash) VALUES (auth.uid(), crypt(_pin, gen_salt('bf')))
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.check_pin(_pin text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT COALESCE((SELECT pin_hash = crypt(_pin, pin_hash) FROM public.user_security WHERE user_id = auth.uid()), false)
$$;

-- Simulated deposit (Mobile Money / card) into own account
CREATE OR REPLACE FUNCTION public.deposit(_account uuid, _amount numeric, _method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE acc public.accounts; tx uuid;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE id = _account AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  UPDATE public.accounts SET balance = balance + _amount WHERE id = _account;
  INSERT INTO public.transactions(user_id, account_id, type, amount, method, label)
  VALUES (auth.uid(), _account, 'deposit', _amount, _method, 'Dépôt ' || _method) RETURNING id INTO tx;
  RETURN tx;
END $$;

-- Transfer to another Filax user, PIN required, fee to platform
CREATE OR REPLACE FUNCTION public.transfer(_from uuid, _to_filax_id text, _amount numeric, _pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE src public.accounts; dst public.accounts; dest_user uuid; f numeric; tx uuid; me text;
BEGIN
  IF NOT public.check_pin(_pin) THEN RAISE EXCEPTION 'Code secret incorrect'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  SELECT * INTO src FROM public.accounts WHERE id = _from AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  IF src.status <> 'active' OR (src.locked_until IS NOT NULL AND src.locked_until > now()) THEN RAISE EXCEPTION 'Compte bloqué'; END IF;
  f := public.filax_fee(_amount);
  IF src.balance < _amount + f THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  SELECT user_id INTO dest_user FROM public.profiles WHERE filax_id = _to_filax_id;
  IF dest_user IS NULL OR dest_user = auth.uid() THEN RAISE EXCEPTION 'Destinataire introuvable'; END IF;
  SELECT * INTO dst FROM public.accounts WHERE user_id = dest_user AND kind = 'main' AND currency = src.currency ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Le destinataire n''a pas de compte dans cette devise'; END IF;
  SELECT filax_id INTO me FROM public.profiles WHERE user_id = auth.uid();
  UPDATE public.accounts SET balance = balance - _amount - f WHERE id = src.id;
  UPDATE public.accounts SET balance = balance + _amount WHERE id = dst.id;
  INSERT INTO public.transactions(user_id, account_id, type, amount, fee, method, label, counterparty)
  VALUES (auth.uid(), src.id, 'transfer_out', _amount, f, 'filax', 'Envoi à ' || _to_filax_id, _to_filax_id) RETURNING id INTO tx;
  INSERT INTO public.transactions(user_id, account_id, type, amount, method, label, counterparty)
  VALUES (dest_user, dst.id, 'transfer_in', _amount, 'filax', 'Reçu de ' || COALESCE(me,''), me);
  INSERT INTO public.platform_fees(transaction_id, amount, currency) VALUES (tx, f, src.currency);
  INSERT INTO public.notifications(user_id, title, body) VALUES (dest_user, 'Virement reçu', _amount || ' ' || src.currency || ' de ' || COALESCE(me,''));
  RETURN tx;
END $$;

-- Group contribution, notifies all members
CREATE OR REPLACE FUNCTION public.contribute(_group uuid, _from uuid, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE src public.accounts; f numeric; tx uuid; who text; gname text;
BEGIN
  IF NOT public.is_group_member(_group, auth.uid()) THEN RAISE EXCEPTION 'Non membre'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  SELECT * INTO src FROM public.accounts WHERE id = _from AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  f := public.filax_fee(_amount);
  IF src.balance < _amount + f THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  SELECT trim(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO who FROM public.profiles WHERE user_id = auth.uid();
  SELECT name INTO gname FROM public.groups WHERE id = _group;
  UPDATE public.accounts SET balance = balance - _amount - f WHERE id = src.id;
  UPDATE public.groups SET collected = collected + _amount WHERE id = _group;
  INSERT INTO public.group_contributions(group_id, user_id, contributor_name, amount) VALUES (_group, auth.uid(), who, _amount);
  INSERT INTO public.transactions(user_id, account_id, type, amount, fee, method, label)
  VALUES (auth.uid(), src.id, 'contribution', _amount, f, 'groupe', 'Cotisation ' || gname) RETURNING id INTO tx;
  INSERT INTO public.platform_fees(transaction_id, amount, currency) VALUES (tx, f, src.currency);
  INSERT INTO public.notifications(user_id, title, body)
  SELECT m.user_id, 'Cotisation reçue', COALESCE(who,'Un membre') || ' a versé ' || _amount || ' dans ' || gname
  FROM public.group_members m WHERE m.group_id = _group;
END $$;

-- Auto-create filax id, partner bank subaccount and main accounts on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fid text := 'FLX-' || upper(substr(replace(NEW.id::text,'-',''),1,8));
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, birth_date, birth_city, email, phone, partner_bank, filax_id, username, partner_subaccount)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    (NULLIF(NEW.raw_user_meta_data ->> 'birth_date', ''))::DATE,
    NEW.raw_user_meta_data ->> 'birth_city',
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE(NEW.raw_user_meta_data ->> 'partner_bank', 'TMB'),
    fid, lower(fid),
    COALESCE(NEW.raw_user_meta_data ->> 'partner_bank', 'TMB') || '-' || substr(replace(NEW.id::text,'-',''),9,10)
  ) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.accounts(user_id, name, kind, currency) VALUES
    (NEW.id, 'Compte Principal USD', 'main', 'USD'),
    (NEW.id, 'Compte Principal CDF', 'main', 'CDF');
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.set_pin(text), public.check_pin(text), public.deposit(uuid,numeric,text), public.transfer(uuid,text,numeric,text), public.contribute(uuid,uuid,numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_pin(text), public.check_pin(text), public.deposit(uuid,numeric,text), public.transfer(uuid,text,numeric,text), public.contribute(uuid,uuid,numeric) TO authenticated;

-- Public profile page (share link) — safe columns only
CREATE OR REPLACE FUNCTION public.public_profile(_username text)
RETURNS TABLE(first_name text, last_name text, filax_id text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT first_name, last_name, filax_id FROM public.profiles WHERE username = lower(_username)
$$;
GRANT EXECUTE ON FUNCTION public.public_profile(text) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts, public.transactions, public.groups, public.group_contributions, public.notifications;