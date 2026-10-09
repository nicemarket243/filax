CREATE OR REPLACE FUNCTION public.deposit(_account uuid, _amount numeric, _method text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE acc public.accounts; tx uuid;
BEGIN
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000000000000 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE id = _account AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  UPDATE public.accounts SET balance = balance + _amount WHERE id = _account;
  INSERT INTO public.transactions(user_id, account_id, type, amount, method, label)
  VALUES (auth.uid(), _account, 'deposit', _amount, _method, 'Dépôt ' || _method) RETURNING id INTO tx;
  INSERT INTO public.notifications(user_id, title, body)
  VALUES (auth.uid(), 'Dépôt reçu', _amount || ' ' || acc.currency || ' crédités sur ' || acc.name);
  RETURN tx;
END $f$;

CREATE OR REPLACE FUNCTION public.owner_update_group(_id uuid, _name text, _target numeric, _deadline date)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
BEGIN
  IF length(trim(coalesce(_name,''))) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Nom invalide'; END IF;
  IF _target IS NOT NULL AND (_target <= 0 OR _target > 1000000000000) THEN RAISE EXCEPTION 'Objectif invalide'; END IF;
  UPDATE public.groups SET name = trim(_name), target = _target, deadline = _deadline WHERE id = _id AND owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Seul le propriétaire peut modifier le groupe'; END IF;
END $f$;

CREATE OR REPLACE FUNCTION public.group_member_list(_group uuid)
 RETURNS TABLE(user_id uuid, name text, filax_id text, contributed numeric, joined_at timestamptz, is_owner boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
BEGIN
  IF NOT public.is_group_member(_group, auth.uid()) AND NOT EXISTS(SELECT 1 FROM public.groups WHERE id=_group AND owner_id=auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT m.user_id, nullif(trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),''), p.filax_id,
    coalesce((SELECT sum(c.amount) FROM public.group_contributions c WHERE c.group_id=_group AND c.user_id=m.user_id),0),
    m.joined_at, (SELECT g.owner_id=m.user_id FROM public.groups g WHERE g.id=_group)
  FROM public.group_members m LEFT JOIN public.profiles p ON p.user_id=m.user_id WHERE m.group_id=_group ORDER BY m.joined_at;
END $f$;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(_account uuid, _status text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF _status NOT IN ('active','blocked') THEN RAISE EXCEPTION 'Statut invalide'; END IF;
  UPDATE public.accounts SET status=_status WHERE id=_account AND user_id<>auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable ou protégé'; END IF;
END $f$;

CREATE OR REPLACE FUNCTION public.admin_list_accounts()
 RETURNS TABLE(id uuid, user_id uuid, owner text, filax_id text, name text, kind text, currency text, balance numeric, status text, created_at timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT a.id, a.user_id, coalesce(nullif(trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),''), p.email), p.filax_id, a.name, a.kind, a.currency, a.balance, a.status, a.created_at
  FROM public.accounts a LEFT JOIN public.profiles p ON p.user_id=a.user_id ORDER BY a.created_at DESC;
END $f$;

CREATE OR REPLACE FUNCTION public.admin_send_notification(_user uuid, _title text, _body text)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF length(trim(coalesce(_title,''))) NOT BETWEEN 2 AND 80 OR length(coalesce(_body,'')) > 500 THEN RAISE EXCEPTION 'Texte invalide'; END IF;
  INSERT INTO public.notifications(user_id,title,body)
  SELECT p.user_id, trim(_title), _body FROM public.profiles p WHERE _user IS NULL OR p.user_id=_user;
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $f$;

CREATE OR REPLACE FUNCTION public.admin_list_notifications()
 RETURNS TABLE(id uuid, recipient text, title text, body text, read boolean, created_at timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT n.id, coalesce(nullif(trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),''), p.email, p.filax_id), n.title, n.body, n.read, n.created_at
  FROM public.notifications n LEFT JOIN public.profiles p ON p.user_id=n.user_id ORDER BY n.created_at DESC LIMIT 200;
END $f$;

CREATE OR REPLACE FUNCTION public.admin_delete_notification(_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  DELETE FROM public.notifications WHERE id=_id;
END $f$;