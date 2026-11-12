ALTER TABLE public.accounts
  ADD COLUMN available_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN reserved_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN pending_incoming numeric NOT NULL DEFAULT 0,
  ADD COLUMN pending_outgoing numeric NOT NULL DEFAULT 0;

UPDATE public.accounts a SET
  available_balance = CASE WHEN a.locked_until IS NOT NULL AND a.locked_until > now() THEN 0 ELSE a.balance END,
  reserved_balance = CASE WHEN a.locked_until IS NOT NULL AND a.locked_until > now() THEN a.balance ELSE 0 END,
  pending_incoming = COALESCE((SELECT sum(t.amount) FROM public.transactions t WHERE t.account_id = a.id AND t.type = 'deposit' AND t.status = 'pending'), 0),
  pending_outgoing = COALESCE((SELECT sum(t.amount + t.fee) FROM public.transactions t WHERE t.account_id = a.id AND t.type IN ('withdraw','transfer_out') AND t.status IN ('created','pending')), 0);

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_nonnegative_buckets CHECK (balance >= 0 AND available_balance >= 0 AND reserved_balance >= 0 AND pending_incoming >= 0 AND pending_outgoing >= 0),
  ADD CONSTRAINT accounts_balance_buckets CHECK (round(balance,2) = round(available_balance + reserved_balance,2));

CREATE OR REPLACE FUNCTION public.finance_fee(_operation text, _method text, _currency text, _amount numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RETURN 0; END IF;
  SELECT round(greatest(r.fixed + (_amount * r.percent / 100), r.min_fee), 2) INTO f
  FROM public.fee_rules r
  WHERE r.active AND (r.operation = _operation OR r.operation = '*')
    AND (r.method IS NULL OR r.method = _method)
    AND (r.partner IS NULL OR r.partner = _method)
    AND (r.currency IS NULL OR r.currency = _currency)
  ORDER BY (CASE WHEN r.operation = '*' THEN 0 ELSE 8 END)
    + (CASE WHEN r.method IS NULL THEN 0 ELSE 4 END)
    + (CASE WHEN r.partner IS NULL THEN 0 ELSE 2 END)
    + (CASE WHEN r.currency IS NULL THEN 0 ELSE 1 END) DESC,
    r.created_at DESC, r.id DESC
  LIMIT 1;
  RETURN COALESCE(f, 0);
END $$;
REVOKE ALL ON FUNCTION public.finance_fee(text,text,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finance_fee(text,text,text,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.operation_fingerprint(_operation text, _account uuid, _amount numeric, _destination text, _related uuid)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
  SELECT encode(digest(jsonb_build_array(_operation, _account, round(_amount,2), COALESCE(_destination,''), _related)::text, 'sha256'), 'hex')
$$;
REVOKE ALL ON FUNCTION public.operation_fingerprint(text,uuid,numeric,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.operation_fingerprint(text,uuid,numeric,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.request_deposit(_account uuid, _amount numeric, _method text, _idempotency_key text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  acc public.accounts;
  tx uuid;
  req public.operation_requests;
  fp text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  PERFORM public.require_kyc();
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000000000000 OR _amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF _method NOT IN ('orange','airtel','mpesa','banque','carte','filax') THEN RAISE EXCEPTION 'Moyen invalide'; END IF;
  IF _idempotency_key IS NULL OR _idempotency_key !~ '^[A-Za-z0-9:_-]{8,80}$' THEN RAISE EXCEPTION 'Clé d''idempotence requise'; END IF;
  fp := public.operation_fingerprint('deposit', _account, _amount, _method, NULL);
  INSERT INTO public.operation_requests(user_id,idempotency_key,fingerprint,operation)
  VALUES(auth.uid(),_idempotency_key,fp,'deposit') ON CONFLICT DO NOTHING RETURNING * INTO req;
  IF NOT FOUND THEN
    SELECT * INTO req FROM public.operation_requests WHERE user_id=auth.uid() AND idempotency_key=_idempotency_key FOR UPDATE;
    IF req.fingerprint <> fp OR req.operation <> 'deposit' THEN RAISE EXCEPTION 'Cette clé a déjà été utilisée avec d''autres paramètres'; END IF;
    IF req.state = 'completed' THEN RETURN req.transaction_id; END IF;
  END IF;
  SELECT * INTO acc FROM public.accounts WHERE id=_account AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  IF acc.status <> 'active' THEN RAISE EXCEPTION 'Compte bloqué'; END IF;
  INSERT INTO public.transactions(user_id,account_id,type,amount,method,label,status,idempotency_key)
  VALUES(auth.uid(),_account,'deposit',_amount,_method,'Dépôt '||_method,'pending',_idempotency_key) RETURNING id INTO tx;
  UPDATE public.accounts SET pending_incoming=pending_incoming+_amount WHERE id=_account;
  UPDATE public.operation_requests SET state='completed',transaction_id=tx,result=jsonb_build_object('transaction_id',tx),completed_at=now()
  WHERE user_id=auth.uid() AND idempotency_key=_idempotency_key;
  INSERT INTO public.notifications(user_id,title,body) VALUES(auth.uid(),'Dépôt en attente',_amount||' '||acc.currency||' en attente de confirmation du paiement');
  RETURN tx;
END $$;
REVOKE ALL ON FUNCTION public.request_deposit(uuid,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_deposit(uuid,numeric,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.deposit(_account uuid, _amount numeric, _method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN RETURN public.request_deposit(_account,_amount,_method,gen_random_uuid()::text); END $$;

CREATE OR REPLACE FUNCTION public.execute_goal_fund(_goal uuid, _from uuid, _amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE g public.goals; a public.accounts; tx uuid;
BEGIN
  SELECT * INTO g FROM public.goals WHERE id=_goal AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Objectif introuvable'; END IF;
  SELECT * INTO a FROM public.accounts WHERE id=_from AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND OR a.currency <> g.currency THEN RAISE EXCEPTION 'Devise différente de l''objectif'; END IF;
  IF a.available_balance-a.pending_outgoing < _amount THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  UPDATE public.accounts SET balance=balance-_amount,available_balance=available_balance-_amount WHERE id=_from;
  UPDATE public.goals SET saved=saved+_amount WHERE id=_goal;
  INSERT INTO public.transactions(user_id,account_id,type,amount,method,label,counterparty,status,confirmed_at)
  VALUES(auth.uid(),_from,'goal_fund',_amount,'filax','Épargne · '||g.name,g.name,'confirmed',now()) RETURNING id INTO tx;
  PERFORM public.post_journal(auth.uid(),tx,'goal_fund',jsonb_build_array(
    jsonb_build_object('ledger_account','account:'||_from::text||':available','account_id',_from,'currency',a.currency,'debit',_amount,'credit',0),
    jsonb_build_object('ledger_account','goal:'||_goal::text||':reserved','currency',a.currency,'debit',0,'credit',_amount)
  ),jsonb_build_object('goal_id',_goal));
  RETURN tx;
END $$;
REVOKE ALL ON FUNCTION public.execute_goal_fund(uuid,uuid,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.execute_goal_fund(uuid,uuid,numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.execute_contribution(_group uuid, _from uuid, _amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.accounts; g public.groups; f numeric; tx uuid; who text;
BEGIN
  IF NOT public.is_group_member(_group,auth.uid()) THEN RAISE EXCEPTION 'Non membre'; END IF;
  SELECT * INTO g FROM public.groups WHERE id=_group FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Groupe introuvable'; END IF;
  SELECT * INTO a FROM public.accounts WHERE id=_from AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  IF a.currency <> g.currency THEN RAISE EXCEPTION 'Devise différente du groupe'; END IF;
  f := public.finance_fee('contribute','groupe',a.currency,_amount);
  IF a.available_balance-a.pending_outgoing < _amount+f THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  SELECT trim(COALESCE(first_name,'')||' '||COALESCE(last_name,'')) INTO who FROM public.profiles WHERE user_id=auth.uid();
  UPDATE public.accounts SET balance=balance-_amount-f,available_balance=available_balance-_amount-f WHERE id=_from;
  UPDATE public.groups SET collected=collected+_amount WHERE id=_group;
  INSERT INTO public.group_contributions(group_id,user_id,contributor_name,amount) VALUES(_group,auth.uid(),who,_amount);
  INSERT INTO public.transactions(user_id,account_id,type,amount,fee,method,label,status,confirmed_at)
  VALUES(auth.uid(),_from,'contribution',_amount,f,'groupe','Cotisation '||g.name,'confirmed',now()) RETURNING id INTO tx;
  INSERT INTO public.platform_fees(transaction_id,amount,currency) SELECT tx,f,a.currency WHERE f>0;
  PERFORM public.post_journal(auth.uid(),tx,'contribution',jsonb_build_array(
    jsonb_build_object('ledger_account','account:'||_from::text||':available','account_id',_from,'currency',a.currency,'debit',_amount+f,'credit',0),
    jsonb_build_object('ledger_account','group:'||_group::text||':reserved','currency',a.currency,'debit',0,'credit',_amount)
  ) || CASE WHEN f>0 THEN jsonb_build_object('ledger_account','platform:fees','currency',a.currency,'debit',0,'credit',f) ELSE '[]'::jsonb END,
  jsonb_build_object('group_id',_group));
  INSERT INTO public.notifications(user_id,title,body)
  SELECT m.user_id,'Cotisation reçue',COALESCE(who,'Un membre')||' a versé '||_amount||' dans '||g.name
  FROM public.group_members m WHERE m.group_id=_group;
  RETURN tx;
END $$;
REVOKE ALL ON FUNCTION public.execute_contribution(uuid,uuid,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.execute_contribution(uuid,uuid,numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.transfer(_from uuid, _to_filax_id text, _amount numeric, _pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE src public.accounts; dst public.accounts; dest_user uuid; f numeric; tx uuid; incoming uuid; me text; bucket text;
BEGIN
  IF NOT public.check_pin(_pin) THEN RAISE EXCEPTION 'Code secret incorrect'; END IF;
  SELECT * INTO src FROM public.accounts WHERE id=_from AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  f := public.finance_fee('transfer','filax',src.currency,_amount);
  IF src.available_balance-src.pending_outgoing < _amount+f THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  SELECT user_id INTO dest_user FROM public.profiles WHERE filax_id=_to_filax_id;
  IF dest_user IS NULL OR dest_user=auth.uid() THEN RAISE EXCEPTION 'Destinataire introuvable'; END IF;
  SELECT * INTO dst FROM public.accounts WHERE user_id=dest_user AND kind='main' AND currency=src.currency ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Le destinataire n''a pas de compte dans cette devise'; END IF;
  IF dst.status <> 'active' THEN RAISE EXCEPTION 'Compte du destinataire indisponible'; END IF;
  SELECT filax_id INTO me FROM public.profiles WHERE user_id=auth.uid();
  UPDATE public.accounts SET balance=balance-_amount-f,available_balance=available_balance-_amount-f WHERE id=src.id;
  bucket := CASE WHEN dst.locked_until IS NOT NULL AND dst.locked_until>now() THEN 'reserved' ELSE 'available' END;
  UPDATE public.accounts SET balance=balance+_amount,
    available_balance=available_balance+CASE WHEN bucket='available' THEN _amount ELSE 0 END,
    reserved_balance=reserved_balance+CASE WHEN bucket='reserved' THEN _amount ELSE 0 END WHERE id=dst.id;
  INSERT INTO public.transactions(user_id,account_id,type,amount,fee,method,label,counterparty,status,confirmed_at)
  VALUES(auth.uid(),src.id,'transfer_out',_amount,f,'filax','Envoi à '||_to_filax_id,_to_filax_id,'confirmed',now()) RETURNING id INTO tx;
  INSERT INTO public.transactions(user_id,account_id,type,amount,method,label,counterparty,status,confirmed_at)
  VALUES(dest_user,dst.id,'transfer_in',_amount,'filax','Reçu de '||COALESCE(me,''),me,'confirmed',now()) RETURNING id INTO incoming;
  INSERT INTO public.platform_fees(transaction_id,amount,currency) SELECT tx,f,src.currency WHERE f>0;
  PERFORM public.post_journal(auth.uid(),tx,'transfer_out',jsonb_build_array(
    jsonb_build_object('ledger_account','account:'||src.id::text||':available','account_id',src.id,'currency',src.currency,'debit',_amount+f,'credit',0),
    jsonb_build_object('ledger_account','clearing:filax','currency',src.currency,'debit',0,'credit',_amount)
  ) || CASE WHEN f>0 THEN jsonb_build_object('ledger_account','platform:fees','currency',src.currency,'debit',0,'credit',f) ELSE '[]'::jsonb END,
  jsonb_build_object('recipient_transaction_id',incoming));
  PERFORM public.post_journal(dest_user,incoming,'transfer_in',jsonb_build_array(
    jsonb_build_object('ledger_account','clearing:filax','currency',src.currency,'debit',_amount,'credit',0),
    jsonb_build_object('ledger_account','account:'||dst.id::text||':'||bucket,'account_id',dst.id,'currency',src.currency,'debit',0,'credit',_amount)
  ),jsonb_build_object('source_transaction_id',tx));
  INSERT INTO public.notifications(user_id,title,body) VALUES(dest_user,'Virement reçu',_amount||' '||src.currency||' de '||COALESCE(me,''));
  RETURN tx;
END $$;

CREATE OR REPLACE FUNCTION public.account_outflow(_account uuid, _operation text, _amount numeric, _pin text DEFAULT '', _global_pin text DEFAULT '', _destination text DEFAULT '', _related uuid DEFAULT NULL, _idempotency_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE
  a public.accounts;
  h text;
  tx uuid;
  lk timestamptz;
  needs_global boolean;
  amt text;
  req public.operation_requests;
  fp text;
  answer jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  PERFORM public.require_kyc();
  IF _amount IS NULL OR _amount<=0 OR _amount>1000000000000 OR _amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF _idempotency_key IS NULL OR _idempotency_key !~ '^[A-Za-z0-9:_-]{8,80}$' THEN RAISE EXCEPTION 'Clé d''idempotence requise'; END IF;
  fp := public.operation_fingerprint(_operation,_account,_amount,_destination,_related);
  INSERT INTO public.operation_requests(user_id,idempotency_key,fingerprint,operation)
  VALUES(auth.uid(),_idempotency_key,fp,_operation) ON CONFLICT DO NOTHING RETURNING * INTO req;
  IF NOT FOUND THEN
    SELECT * INTO req FROM public.operation_requests WHERE user_id=auth.uid() AND idempotency_key=_idempotency_key FOR UPDATE;
    IF req.fingerprint<>fp OR req.operation<>_operation THEN RAISE EXCEPTION 'Cette clé a déjà été utilisée avec d''autres paramètres'; END IF;
    IF req.state='completed' THEN RETURN COALESCE(req.result,'{}'::jsonb)||jsonb_build_object('ok',true,'duplicate',true); END IF;
  END IF;
  IF _operation='transfer' THEN PERFORM pg_advisory_xact_lock(hashtext('filax_internal_transfer')); END IF;
  SELECT locked_until INTO lk FROM public.pin_attempts WHERE user_id=auth.uid();
  IF lk IS NOT NULL AND lk>now() THEN RAISE EXCEPTION 'Trop d''essais de code : réessayez dans 15 minutes'; END IF;
  SELECT * INTO a FROM public.accounts WHERE id=_account AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  IF a.status<>'active' THEN RAISE EXCEPTION 'Compte bloqué'; END IF;
  IF a.locked_until IS NOT NULL AND a.locked_until>now() THEN RAISE EXCEPTION 'Fonds bloqués jusqu''au %',to_char(a.locked_until,'DD/MM/YYYY'); END IF;
  IF a.reserved_balance>0 THEN
    UPDATE public.accounts SET available_balance=balance,reserved_balance=0 WHERE id=a.id RETURNING * INTO a;
  END IF;
  SELECT pin_hash INTO h FROM public.account_security WHERE account_id=a.id;
  IF h IS NOT NULL AND (_pin IS NULL OR _pin !~ '^[0-9]{4}$' OR crypt(_pin,h)<>h) THEN
    PERFORM public.pin_failure(); RETURN jsonb_build_object('ok',false,'error','Code du sous-compte incorrect');
  END IF;
  needs_global := _operation IN ('withdraw','transfer','external');
  IF needs_global AND NOT public.has_pin() THEN RETURN jsonb_build_object('ok',false,'error','Créez d''abord votre code PIN à 4 chiffres'); END IF;
  IF needs_global AND NOT public.check_pin(_global_pin) THEN
    PERFORM public.pin_failure(); RETURN jsonb_build_object('ok',false,'error','Code PIN erroné');
  END IF;
  DELETE FROM public.pin_attempts WHERE user_id=auth.uid();
  PERFORM set_config('filax.authorized_account',a.id::text,true);
  amt := to_char(_amount,'FM999G999G999G990D00')||' '||a.currency;
  CASE _operation
    WHEN 'withdraw' THEN
      IF _destination NOT IN ('orange','airtel','mpesa','banque','carte','filax') THEN RAISE EXCEPTION 'Moyen invalide'; END IF;
      tx:=public.withdraw(a.id,_amount,_destination);
    WHEN 'transfer' THEN
      IF _destination IS NULL OR length(_destination)>30 OR _destination !~ '^FLX-[A-Z0-9-]+$' THEN RAISE EXCEPTION 'ID FILAX invalide'; END IF;
      tx:=public.transfer(a.id,_destination,_amount,_global_pin);
      INSERT INTO public.notifications(user_id,title,body) VALUES(auth.uid(),'Transfert réussi','Votre transfert de '||amt||' vers '||_destination||' a réussi avec succès.');
    WHEN 'external' THEN
      IF length(trim(_destination)) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Destinataire invalide'; END IF;
      tx:=public.transfer_external(a.id,_amount,_destination,_global_pin);
    WHEN 'goal' THEN tx:=public.execute_goal_fund(_related,a.id,_amount);
    WHEN 'contribute' THEN tx:=public.execute_contribution(_related,a.id,_amount);
    ELSE RAISE EXCEPTION 'Opération invalide';
  END CASE;
  UPDATE public.transactions SET idempotency_key=_idempotency_key WHERE id=tx;
  answer:=jsonb_build_object('ok',true,'transaction_id',tx);
  UPDATE public.operation_requests SET state='completed',transaction_id=tx,result=answer,completed_at=now()
  WHERE user_id=auth.uid() AND idempotency_key=_idempotency_key;
  RETURN answer;
END $$;
REVOKE ALL ON FUNCTION public.account_outflow(uuid,text,numeric,text,text,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.account_outflow(uuid,text,numeric,text,text,text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_confirm_deposit(_tx uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.transactions; acc public.accounts; bucket text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO t FROM public.transactions WHERE id=_tx FOR UPDATE;
  IF NOT FOUND OR t.type<>'deposit' OR t.status<>'pending' THEN RAISE EXCEPTION 'Dépôt non en attente'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE id=t.account_id FOR UPDATE;
  bucket:=CASE WHEN acc.locked_until IS NOT NULL AND acc.locked_until>now() THEN 'reserved' ELSE 'available' END;
  UPDATE public.accounts SET balance=balance+t.amount,pending_incoming=greatest(0,pending_incoming-t.amount),
    available_balance=available_balance+CASE WHEN bucket='available' THEN t.amount ELSE 0 END,
    reserved_balance=reserved_balance+CASE WHEN bucket='reserved' THEN t.amount ELSE 0 END
  WHERE id=t.account_id;
  UPDATE public.transactions SET status='confirmed',confirmed_at=now() WHERE id=_tx;
  PERFORM public.post_journal(t.user_id,t.id,'deposit',jsonb_build_array(
    jsonb_build_object('ledger_account','clearing:'||COALESCE(t.method,'unknown'),'currency',acc.currency,'debit',t.amount,'credit',0),
    jsonb_build_object('ledger_account','account:'||acc.id::text||':'||bucket,'account_id',acc.id,'currency',acc.currency,'debit',0,'credit',t.amount)
  ),jsonb_build_object('confirmed_by',auth.uid()));
  PERFORM public.write_audit('deposit_confirmed',_tx::text,jsonb_build_object('amount',t.amount,'currency',acc.currency));
  INSERT INTO public.notifications(user_id,title,body) VALUES(t.user_id,'Dépôt confirmé',t.amount||' '||acc.currency||' crédités sur '||acc.name);
END $$;

CREATE OR REPLACE FUNCTION public.admin_fail_transaction(_tx uuid,_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.transactions;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO t FROM public.transactions WHERE id=_tx FOR UPDATE;
  IF NOT FOUND OR t.status NOT IN ('created','pending') THEN RAISE EXCEPTION 'Opération non en attente'; END IF;
  IF t.type='deposit' THEN
    UPDATE public.accounts SET pending_incoming=greatest(0,pending_incoming-t.amount) WHERE id=t.account_id;
  ELSIF t.type IN ('withdraw','transfer_out') THEN
    UPDATE public.accounts SET pending_outgoing=greatest(0,pending_outgoing-t.amount-t.fee) WHERE id=t.account_id;
  END IF;
  UPDATE public.transactions SET status='failed',failure_reason=left(COALESCE(_reason,''),200) WHERE id=_tx;
  PERFORM public.write_audit('transaction_failed',_tx::text,jsonb_build_object('reason',_reason));
  INSERT INTO public.notifications(user_id,title,body) VALUES(t.user_id,'Opération échouée',COALESCE(NULLIF(_reason,''),'Le paiement n''a pas été reçu.'));
END $$;

CREATE OR REPLACE FUNCTION public.admin_refund_transaction(_tx uuid,_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.transactions; acc public.accounts; refund_id uuid; bucket text; total numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO t FROM public.transactions WHERE id=_tx FOR UPDATE;
  IF NOT FOUND OR t.status<>'confirmed' OR t.type<>'withdraw' THEN RAISE EXCEPTION 'Remboursement indisponible : une contre-écriture complète est requise.'; END IF;
  IF length(trim(COALESCE(_reason,''))) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Précisez le motif du remboursement'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE id=t.account_id FOR UPDATE;
  total:=t.amount+t.fee;
  bucket:=CASE WHEN acc.locked_until IS NOT NULL AND acc.locked_until>now() THEN 'reserved' ELSE 'available' END;
  UPDATE public.accounts SET balance=balance+total,
    available_balance=available_balance+CASE WHEN bucket='available' THEN total ELSE 0 END,
    reserved_balance=reserved_balance+CASE WHEN bucket='reserved' THEN total ELSE 0 END WHERE id=t.account_id;
  UPDATE public.transactions SET status='refunded',failure_reason=_reason WHERE id=_tx;
  INSERT INTO public.transactions(user_id,account_id,type,amount,method,label,status,confirmed_at)
  VALUES(t.user_id,t.account_id,'refund',total,'filax','Remboursement · '||COALESCE(t.label,''),'confirmed',now()) RETURNING id INTO refund_id;
  PERFORM public.post_journal(t.user_id,refund_id,'refund',jsonb_build_array(
    jsonb_build_object('ledger_account','clearing:refund','currency',acc.currency,'debit',total,'credit',0),
    jsonb_build_object('ledger_account','account:'||acc.id::text||':'||bucket,'account_id',acc.id,'currency',acc.currency,'debit',0,'credit',total)
  ),jsonb_build_object('refunded_transaction_id',_tx,'reason',_reason));
  PERFORM public.write_audit('transaction_refunded',_tx::text,jsonb_build_object('amount',total,'reason',_reason));
  INSERT INTO public.notifications(user_id,title,body) VALUES(t.user_id,'Remboursement',total||' '||acc.currency||' recrédités sur '||acc.name);
END $$;

CREATE OR REPLACE FUNCTION public.admin_decide_withdrawal(_id uuid,_approved boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE w public.group_withdrawals; g public.groups; a public.accounts; f numeric; tx uuid; bucket text; lines jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO w FROM public.group_withdrawals WHERE id=_id AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucune demande en attente'; END IF;
  SELECT * INTO g FROM public.groups WHERE id=w.group_id FOR UPDATE;
  IF NOT _approved THEN
    UPDATE public.group_withdrawals SET status='rejected',decided_at=now() WHERE id=_id;
    INSERT INTO public.notifications(user_id,title,body) VALUES(w.requested_by,'Retrait refusé','Votre demande sur '||g.name||' a été refusée.');
    RETURN;
  END IF;
  IF g.collected<w.amount THEN RAISE EXCEPTION 'Cagnotte insuffisante'; END IF;
  SELECT * INTO a FROM public.accounts WHERE id=w.account_id AND user_id=w.requested_by FOR UPDATE;
  IF NOT FOUND OR a.currency<>g.currency OR a.status<>'active' THEN RAISE EXCEPTION 'Compte de destination indisponible'; END IF;
  f:=public.finance_fee('group_withdraw','groupe',g.currency,w.amount);
  IF w.amount-f<=0 THEN RAISE EXCEPTION 'Le montant net doit être positif'; END IF;
  UPDATE public.groups SET collected=collected-w.amount WHERE id=g.id;
  bucket:=CASE WHEN a.locked_until IS NOT NULL AND a.locked_until>now() THEN 'reserved' ELSE 'available' END;
  UPDATE public.accounts SET balance=balance+w.amount-f,
    available_balance=available_balance+CASE WHEN bucket='available' THEN w.amount-f ELSE 0 END,
    reserved_balance=reserved_balance+CASE WHEN bucket='reserved' THEN w.amount-f ELSE 0 END WHERE id=w.account_id;
  UPDATE public.group_withdrawals SET status='approved',decided_at=now() WHERE id=_id;
  INSERT INTO public.transactions(user_id,account_id,type,amount,fee,method,label,counterparty,status,confirmed_at)
  VALUES(w.requested_by,w.account_id,'group_withdraw',w.amount,f,'groupe','Retrait cagnotte '||g.name,g.name,'confirmed',now()) RETURNING id INTO tx;
  INSERT INTO public.platform_fees(transaction_id,amount,currency) SELECT tx,f,g.currency WHERE f>0;
  lines:=jsonb_build_array(
    jsonb_build_object('ledger_account','group:'||g.id::text||':reserved','currency',g.currency,'debit',w.amount,'credit',0),
    jsonb_build_object('ledger_account','account:'||a.id::text||':'||bucket,'account_id',a.id,'currency',g.currency,'debit',0,'credit',w.amount-f));
  IF f>0 THEN lines:=lines||jsonb_build_object('ledger_account','platform:fees','currency',g.currency,'debit',0,'credit',f); END IF;
  PERFORM public.post_journal(w.requested_by,tx,'group_withdraw',lines,jsonb_build_object('group_id',g.id,'withdrawal_id',_id));
  INSERT INTO public.notifications(user_id,title,body)
  SELECT m.user_id,'Retrait validé',w.amount||' '||g.currency||' retirés de '||g.name FROM public.group_members m WHERE m.group_id=g.id;
END $$;

CREATE OR REPLACE FUNCTION public.request_group_withdrawal(_group uuid,_account uuid,_amount numeric,_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE g public.groups; acc public.accounts; pend numeric; rid uuid;
BEGIN
  SELECT * INTO g FROM public.groups WHERE id=_group AND owner_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seul le propriétaire peut demander un retrait'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE id=_account AND user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  IF acc.currency<>g.currency THEN RAISE EXCEPTION 'Devise différente du groupe'; END IF;
  IF _amount IS NULL OR _amount<=0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  SELECT COALESCE(sum(amount),0) INTO pend FROM public.group_withdrawals WHERE group_id=_group AND status='pending';
  IF g.collected<_amount+pend THEN RAISE EXCEPTION 'Montant supérieur à la cagnotte disponible'; END IF;
  INSERT INTO public.group_withdrawals(group_id,requested_by,account_id,amount,reason)
  VALUES(_group,auth.uid(),_account,_amount,left(_reason,200)) RETURNING id INTO rid;
  INSERT INTO public.notifications(user_id,title,body)
  SELECT m.user_id,'Demande de retrait','Retrait de '||_amount||' '||g.currency||' demandé sur '||g.name||' — en attente de validation'
  FROM public.group_members m WHERE m.group_id=_group;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reconciliation()
RETURNS TABLE(currency text,total_balance numeric,ledger_net numeric,gap numeric,pending_count bigint,pending_amount numeric,fees numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  WITH led AS (SELECT a.currency AS cur,sum(e.credit-e.debit) AS net FROM public.ledger_entries e JOIN public.accounts a ON a.id=e.account_id GROUP BY a.currency),
  bal AS (SELECT a.currency AS cur,sum(a.balance) AS b FROM public.accounts a GROUP BY a.currency),
  pen AS (SELECT a.currency AS cur,count(*) AS c,sum(t.amount) AS s FROM public.transactions t JOIN public.accounts a ON a.id=t.account_id WHERE t.status='pending' GROUP BY a.currency),
  fee AS (SELECT f.currency AS cur,sum(f.amount) AS s FROM public.platform_fees f GROUP BY f.currency)
  SELECT bal.cur,bal.b,COALESCE(led.net,0),bal.b-COALESCE(led.net,0),COALESCE(pen.c,0),COALESCE(pen.s,0),COALESCE(fee.s,0)
  FROM bal LEFT JOIN led ON led.cur=bal.cur LEFT JOIN pen ON pen.cur=bal.cur LEFT JOIN fee ON fee.cur=bal.cur;
END $$;

ALTER TABLE public.accounts ADD CONSTRAINT accounts_pending_outgoing_bound CHECK (round(pending_outgoing,2) <= round(available_balance,2));