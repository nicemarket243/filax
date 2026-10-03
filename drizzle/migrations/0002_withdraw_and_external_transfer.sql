CREATE OR REPLACE FUNCTION public.withdraw(_account uuid, _amount numeric, _method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE acc public.accounts; f numeric; tx uuid;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE id = _account AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  IF acc.status <> 'active' OR (acc.locked_until IS NOT NULL AND acc.locked_until > now()) THEN RAISE EXCEPTION 'Compte bloqué'; END IF;
  f := public.filax_fee(_amount);
  IF acc.balance < _amount + f THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  UPDATE public.accounts SET balance = balance - _amount - f WHERE id = _account;
  INSERT INTO public.transactions(user_id, account_id, type, amount, fee, method, label)
  VALUES (auth.uid(), _account, 'withdraw', _amount, f, _method, 'Retrait ' || _method) RETURNING id INTO tx;
  INSERT INTO public.platform_fees(transaction_id, amount, currency) VALUES (tx, f, acc.currency);
  RETURN tx;
END $$;

CREATE OR REPLACE FUNCTION public.transfer_external(_from uuid, _amount numeric, _label text, _pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE acc public.accounts; f numeric; tx uuid;
BEGIN
  IF NOT public.check_pin(_pin) THEN RAISE EXCEPTION 'Code secret incorrect'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE id = _from AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  IF acc.status <> 'active' OR (acc.locked_until IS NOT NULL AND acc.locked_until > now()) THEN RAISE EXCEPTION 'Compte bloqué'; END IF;
  f := public.filax_fee(_amount);
  IF acc.balance < _amount + f THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  UPDATE public.accounts SET balance = balance - _amount - f WHERE id = _from;
  INSERT INTO public.transactions(user_id, account_id, type, amount, fee, method, label, counterparty)
  VALUES (auth.uid(), _from, 'transfer_out', _amount, f, 'banque', 'Envoi à ' || left(_label, 120), left(_label, 120)) RETURNING id INTO tx;
  INSERT INTO public.platform_fees(transaction_id, amount, currency) VALUES (tx, f, acc.currency);
  RETURN tx;
END $$;

REVOKE EXECUTE ON FUNCTION public.withdraw(uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transfer_external(uuid, numeric, text, text) FROM anon;