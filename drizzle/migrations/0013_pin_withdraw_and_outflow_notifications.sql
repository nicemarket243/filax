CREATE OR REPLACE FUNCTION public.has_pin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_security WHERE user_id = auth.uid() AND pin_hash IS NOT NULL)
$$;
REVOKE ALL ON FUNCTION public.has_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_pin() TO authenticated;

CREATE OR REPLACE FUNCTION public.record_outflow_failure(_account uuid, _operation text, _amount numeric, _reason text, _destination text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.accounts; r text; lbl text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF _operation NOT IN ('withdraw','transfer','external') THEN RETURN; END IF;
  r := left(coalesce(nullif(trim(_reason),''),'Opération refusée'),200);
  SELECT * INTO a FROM public.accounts WHERE id=_account AND user_id=auth.uid();
  IF NOT FOUND THEN RETURN; END IF;
  lbl := CASE WHEN _operation='withdraw' THEN 'Retrait ' ELSE 'Transfert vers ' END || left(coalesce(_destination,''),60);
  BEGIN
    IF _amount > 0 AND _amount <= 1000000000000 THEN
      INSERT INTO public.transactions(user_id, account_id, type, amount, fee, method, label, status, failure_reason)
      VALUES (auth.uid(), a.id, CASE WHEN _operation='withdraw' THEN 'withdraw' ELSE 'transfer_out' END, -abs(_amount), 0,
              CASE WHEN _operation='withdraw' THEN left(_destination,20) ELSE 'filax' END, lbl, 'failed', r);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  INSERT INTO public.notifications(user_id, title, body)
  VALUES (auth.uid(), CASE WHEN _operation='withdraw' THEN 'Retrait échoué' ELSE 'Transfert échoué' END,
          'Votre opération de ' || to_char(abs(_amount),'FM999G999G999G990D00') || ' ' || a.currency || ' sur votre ' || a.name || ' a échoué. Motif : ' || r);
END $$;
REVOKE ALL ON FUNCTION public.record_outflow_failure(uuid,text,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_outflow_failure(uuid,text,numeric,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.account_outflow(_account uuid, _operation text, _amount numeric, _pin text DEFAULT ''::text, _global_pin text DEFAULT ''::text, _destination text DEFAULT ''::text, _related uuid DEFAULT NULL::uuid, _idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
DECLARE a public.accounts; h text; tx uuid; lk timestamptz; needs_global boolean; amt text;
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
 needs_global := _operation IN ('withdraw','transfer','external');
 IF needs_global AND NOT public.has_pin() THEN
   RETURN jsonb_build_object('ok',false,'error','Créez d''abord votre code PIN à 4 chiffres');
 END IF;
 IF needs_global AND NOT public.check_pin(_global_pin) THEN
   PERFORM public.pin_failure();
   RETURN jsonb_build_object('ok',false,'error','Code PIN erroné');
 END IF;
 DELETE FROM public.pin_attempts WHERE user_id=auth.uid();
 PERFORM set_config('filax.authorized_account',a.id::text,true);
 amt := to_char(_amount,'FM999G999G999G990D00') || ' ' || a.currency;
 CASE _operation
 WHEN 'withdraw' THEN
   IF _destination NOT IN ('orange','airtel','mpesa','banque','carte','filax') THEN RAISE EXCEPTION 'Moyen invalide'; END IF;
   tx:=public.withdraw(a.id,_amount,_destination);
   INSERT INTO public.notifications(user_id,title,body) VALUES (auth.uid(),'Retrait réussi','Vous avez retiré ' || amt || ' sur votre ' || a.name || '.');
 WHEN 'transfer' THEN
   IF _destination IS NULL OR length(_destination)>30 OR _destination !~ '^FLX-[A-Z0-9-]+$' THEN RAISE EXCEPTION 'ID FILAX invalide'; END IF;
   tx:=public.transfer(a.id,_destination,_amount,_global_pin);
 WHEN 'external' THEN
   IF length(trim(_destination)) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Destinataire invalide'; END IF;
   tx:=public.transfer_external(a.id,_amount,_destination,_global_pin);
   INSERT INTO public.notifications(user_id,title,body) VALUES (auth.uid(),'Transfert réussi','Votre transfert de ' || amt || ' vers ' || left(_destination,80) || ' a réussi avec succès.');
 WHEN 'goal' THEN PERFORM public.fund_goal(_related,a.id,_amount);
 WHEN 'contribute' THEN PERFORM public.contribute(_related,a.id,_amount);
 ELSE RAISE EXCEPTION 'Opération invalide';
 END CASE;
 PERFORM set_config('filax.authorized_account','',true);
 IF tx IS NOT NULL THEN
   UPDATE public.transactions SET confirmed_at=now(), idempotency_key=left(_idempotency_key,80) WHERE id=tx;
 END IF;
 RETURN jsonb_build_object('ok',true,'transaction_id',tx);
END $function$;