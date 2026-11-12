CREATE FUNCTION public.test_fixture_confirm_deposit(_tx uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  t public.transactions;
  acc public.accounts;
BEGIN
  IF auth.uid() <> '97b7739a-2fbb-43cc-8661-d4a064c1416e'::uuid THEN
    RAISE EXCEPTION 'Accès réservé au compte fictif de concurrence';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_demo AND email LIKE 'filax-conc-source-%'
  ) THEN
    RAISE EXCEPTION 'Profil fictif isolé requis';
  END IF;
  SELECT * INTO t FROM public.transactions WHERE id = _tx FOR UPDATE;
  IF NOT FOUND OR t.user_id <> auth.uid() OR t.type <> 'deposit'
     OR t.status <> 'pending' OR t.amount <> 1000 OR t.method <> 'filax' THEN
    RAISE EXCEPTION 'Dépôt fictif invalide';
  END IF;
  SELECT * INTO acc FROM public.accounts WHERE id = t.account_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR acc.currency <> 'USD' OR acc.balance <> 0 OR acc.available_balance <> 0 THEN
    RAISE EXCEPTION 'Compte fictif initial invalide';
  END IF;
  UPDATE public.accounts
  SET balance = balance + t.amount,
      available_balance = available_balance + t.amount,
      pending_incoming = greatest(0, pending_incoming - t.amount)
  WHERE id = acc.id;
  UPDATE public.transactions SET status = 'confirmed', confirmed_at = now() WHERE id = t.id;
  PERFORM public.post_journal(t.user_id, t.id, 'deposit', jsonb_build_array(
    jsonb_build_object('ledger_account', 'sandbox:opening', 'currency', acc.currency, 'debit', t.amount, 'credit', 0),
    jsonb_build_object('ledger_account', 'account:' || acc.id::text || ':available', 'account_id', acc.id, 'currency', acc.currency, 'debit', 0, 'credit', t.amount)
  ), jsonb_build_object('fixture', 'isolated_sql_concurrency'));
  INSERT INTO public.notifications(user_id, title, body)
  VALUES(t.user_id, 'Fixture de test confirmée', '1000 USD fictifs pour le test de concurrence isolé');
END $$;
REVOKE ALL ON FUNCTION public.test_fixture_confirm_deposit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.test_fixture_confirm_deposit(uuid) TO authenticated;