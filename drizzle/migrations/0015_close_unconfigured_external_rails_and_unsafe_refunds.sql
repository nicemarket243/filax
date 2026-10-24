CREATE OR REPLACE FUNCTION public.withdraw(_account uuid, _amount numeric, _method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Prestataire non connecté : aucun retrait envoyé et aucun solde débité.' USING ERRCODE = '55000';
END $$;
CREATE OR REPLACE FUNCTION public.transfer_external(_from uuid, _amount numeric, _label text, _pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Les transferts externes sont indisponibles tant que le prestataire n’est pas connecté.' USING ERRCODE = '55000';
END $$;
REVOKE ALL ON FUNCTION public.withdraw(uuid,numeric,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transfer_external(uuid,numeric,text,text) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.admin_refund_transaction(_tx uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.transactions; acc public.accounts;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO t FROM public.transactions WHERE id=_tx FOR UPDATE;
  IF NOT FOUND OR t.status <> 'confirmed' OR t.type <> 'withdraw' THEN
    RAISE EXCEPTION 'Remboursement indisponible : une contre-écriture complète est requise pour les transferts et cotisations.' USING ERRCODE = '55000';
  END IF;
  IF length(trim(coalesce(_reason,''))) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Précisez le motif du remboursement'; END IF;
  UPDATE public.accounts SET balance=balance+t.amount+t.fee WHERE id=t.account_id RETURNING * INTO acc;
  UPDATE public.transactions SET status='refunded', failure_reason=_reason WHERE id=_tx;
  INSERT INTO public.transactions(user_id,account_id,type,amount,method,label,status,confirmed_at)
  VALUES(t.user_id,t.account_id,'refund',t.amount+t.fee,'filax','Remboursement · '||coalesce(t.label,''),'confirmed',now());
  PERFORM public.write_audit('transaction_refunded',_tx::text,jsonb_build_object('amount',t.amount+t.fee,'reason',_reason));
  INSERT INTO public.notifications(user_id,title,body) VALUES(t.user_id,'Remboursement',(t.amount+t.fee)||' '||acc.currency||' recrédités sur '||acc.name);
END $$;
REVOKE ALL ON FUNCTION public.admin_refund_transaction(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_refund_transaction(uuid,text) TO authenticated;
REVOKE ALL ON public.account_security, public.user_security, public.pin_attempts, public.platform_fees FROM anon, authenticated;
GRANT ALL ON public.account_security, public.user_security, public.pin_attempts, public.platform_fees TO service_role;
REVOKE ALL ON public.transactions, public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.transactions, public.user_roles TO authenticated;
GRANT ALL ON public.transactions, public.user_roles TO service_role;
REVOKE EXECUTE ON FUNCTION public.account_outflow(uuid,text,numeric,text,text,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_outflow(uuid,text,numeric,text,text,text,uuid,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_confirm_deposit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_confirm_deposit(uuid) TO authenticated;
COMMENT ON FUNCTION public.withdraw(uuid,numeric,text) IS 'Closed external rail: no mutation until a documented, authorized provider is implemented.';
COMMENT ON FUNCTION public.transfer_external(uuid,numeric,text,text) IS 'Closed external rail: never debit without provider settlement architecture.';