CREATE TABLE public.ledger_journals (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_id uuid UNIQUE REFERENCES public.transactions(id),
  operation text NOT NULL,
  payload jsonb NOT NULL,
  previous_hash text,
  hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ledger_journals TO authenticated;
GRANT ALL ON public.ledger_journals TO service_role;
ALTER TABLE public.ledger_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ledger journals read" ON public.ledger_journals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ledger_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  journal_id uuid NOT NULL REFERENCES public.ledger_journals(id),
  line_no integer NOT NULL,
  ledger_account text NOT NULL,
  account_id uuid REFERENCES public.accounts(id),
  currency text NOT NULL,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journal_id, line_no),
  CHECK (debit >= 0 AND credit >= 0),
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);
GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ledger entries read" ON public.ledger_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ledger_journals j WHERE j.id = journal_id AND (j.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE TABLE public.operation_requests (
  user_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  fingerprint text NOT NULL,
  operation text NOT NULL,
  state text NOT NULL DEFAULT 'processing' CHECK (state IN ('processing','completed')),
  transaction_id uuid REFERENCES public.transactions(id),
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (user_id, idempotency_key)
);
GRANT ALL ON public.operation_requests TO service_role;
ALTER TABLE public.operation_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RAISE EXCEPTION 'Le livre comptable est infalsifiable : modification et suppression interdites';
END $$;
CREATE TRIGGER ledger_journals_immutable BEFORE UPDATE OR DELETE ON public.ledger_journals
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();
CREATE TRIGGER ledger_entries_immutable BEFORE UPDATE OR DELETE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_mutation();

CREATE OR REPLACE FUNCTION public.post_journal(
  _user uuid,
  _tx uuid,
  _operation text,
  _lines jsonb,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
DECLARE
  existing uuid;
  jid uuid;
  previous text;
  body jsonb;
  bad_currency text;
  idx integer;
  line jsonb;
BEGIN
  IF _user IS NULL OR _operation IS NULL OR length(_operation) NOT BETWEEN 2 AND 60 THEN
    RAISE EXCEPTION 'Journal invalide';
  END IF;
  IF jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) < 2 THEN
    RAISE EXCEPTION 'Une écriture à double entrée exige au moins deux lignes';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(_lines) AS x(ledger_account text, account_id text, currency text, debit numeric, credit numeric)
    WHERE ledger_account IS NULL OR length(ledger_account) NOT BETWEEN 1 AND 160
       OR currency IS NULL OR currency !~ '^[A-Z]{3}$'
       OR debit IS NULL OR credit IS NULL OR debit < 0 OR credit < 0
       OR NOT ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
  ) THEN
    RAISE EXCEPTION 'Ligne comptable invalide';
  END IF;
  SELECT x.currency INTO bad_currency
  FROM jsonb_to_recordset(_lines) AS x(ledger_account text, account_id text, currency text, debit numeric, credit numeric)
  GROUP BY x.currency HAVING round(sum(x.debit), 2) <> round(sum(x.credit), 2) LIMIT 1;
  IF bad_currency IS NOT NULL THEN
    RAISE EXCEPTION 'Écriture non équilibrée en %', bad_currency;
  END IF;
  IF _tx IS NOT NULL THEN
    SELECT id INTO existing FROM public.ledger_journals WHERE transaction_id = _tx;
    IF FOUND THEN RETURN existing; END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('filax_ledger_chain_v1'));
  SELECT hash INTO previous FROM public.ledger_journals ORDER BY sequence DESC LIMIT 1;
  body := jsonb_build_object('user_id', _user, 'transaction_id', _tx, 'operation', _operation, 'lines', _lines, 'metadata', COALESCE(_metadata, '{}'::jsonb));
  INSERT INTO public.ledger_journals(user_id, transaction_id, operation, payload, previous_hash, hash)
  VALUES (_user, _tx, _operation, body, previous, encode(digest(COALESCE(previous, '') || body::text, 'sha256'), 'hex'))
  RETURNING id INTO jid;
  FOR idx IN 0..jsonb_array_length(_lines) - 1 LOOP
    line := _lines -> idx;
    INSERT INTO public.ledger_entries(journal_id, line_no, ledger_account, account_id, currency, debit, credit)
    VALUES (jid, idx + 1, line ->> 'ledger_account', NULLIF(line ->> 'account_id', '')::uuid,
      line ->> 'currency', (line ->> 'debit')::numeric, (line ->> 'credit')::numeric);
  END LOOP;
  RETURN jid;
END $$;
REVOKE ALL ON FUNCTION public.post_journal(uuid,uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_journal(uuid,uuid,text,jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.ledger_integrity()
RETURNS TABLE(journal_count bigint, broken_hash_count bigint, unbalanced_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  WITH ordered AS (
    SELECT j.*, lag(j.hash) OVER (ORDER BY j.sequence) AS expected_previous
    FROM public.ledger_journals j
  ), checked AS (
    SELECT o.sequence,
      (o.previous_hash IS NOT DISTINCT FROM o.expected_previous
       AND o.hash = encode(digest(COALESCE(o.expected_previous, '') || o.payload::text, 'sha256'), 'hex')) AS hash_ok
    FROM ordered o
  ), balances AS (
    SELECT e.journal_id, e.currency, sum(e.debit) AS debits, sum(e.credit) AS credits
    FROM public.ledger_entries e GROUP BY e.journal_id, e.currency
  )
  SELECT (SELECT count(*) FROM public.ledger_journals),
    (SELECT count(*) FROM checked WHERE NOT hash_ok),
    (SELECT count(DISTINCT journal_id) FROM balances WHERE round(debits,2) <> round(credits,2));
END $$;
REVOKE ALL ON FUNCTION public.ledger_integrity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ledger_integrity() TO authenticated;

DO $$
DECLARE
  tx_row record;
  acc_row record;
  net numeric;
  opening numeric;
  bucket text;
  lines jsonb;
BEGIN
  FOR tx_row IN
    SELECT t.*, a.currency, a.locked_until
    FROM public.transactions t JOIN public.accounts a ON a.id = t.account_id
    WHERE t.status IN ('confirmed','refunded') AND t.amount >= 0
      AND NOT EXISTS (SELECT 1 FROM public.ledger_journals j WHERE j.transaction_id = t.id)
    ORDER BY t.created_at, t.id
  LOOP
    bucket := CASE WHEN tx_row.locked_until IS NOT NULL AND tx_row.locked_until > now() THEN 'reserved' ELSE 'available' END;
    IF tx_row.type IN ('deposit','transfer_in','refund') THEN
      lines := jsonb_build_array(
        jsonb_build_object('ledger_account', CASE WHEN tx_row.type = 'refund' THEN 'clearing:refund' ELSE 'clearing:' || COALESCE(tx_row.method,'internal') END, 'currency', tx_row.currency, 'debit', tx_row.amount, 'credit', 0),
        jsonb_build_object('ledger_account', 'account:' || tx_row.account_id::text || ':' || bucket, 'account_id', tx_row.account_id, 'currency', tx_row.currency, 'debit', 0, 'credit', tx_row.amount));
    ELSIF tx_row.type = 'group_withdraw' THEN
      lines := jsonb_build_array(
        jsonb_build_object('ledger_account', 'group:' || COALESCE(tx_row.counterparty,'unknown'), 'currency', tx_row.currency, 'debit', tx_row.amount, 'credit', 0),
        jsonb_build_object('ledger_account', 'account:' || tx_row.account_id::text || ':' || bucket, 'account_id', tx_row.account_id, 'currency', tx_row.currency, 'debit', 0, 'credit', tx_row.amount - tx_row.fee));
      IF tx_row.fee > 0 THEN lines := lines || jsonb_build_object('ledger_account', 'platform:fees', 'currency', tx_row.currency, 'debit', 0, 'credit', tx_row.fee); END IF;
    ELSE
      lines := jsonb_build_array(
        jsonb_build_object('ledger_account', 'account:' || tx_row.account_id::text || ':' || bucket, 'account_id', tx_row.account_id, 'currency', tx_row.currency, 'debit', tx_row.amount + tx_row.fee, 'credit', 0),
        jsonb_build_object('ledger_account', CASE WHEN tx_row.type = 'goal_fund' THEN 'goal:' || COALESCE(tx_row.counterparty,'unknown') WHEN tx_row.type = 'contribution' THEN 'group:' || COALESCE(tx_row.label,'unknown') ELSE 'clearing:' || COALESCE(tx_row.method,'internal') END, 'currency', tx_row.currency, 'debit', 0, 'credit', tx_row.amount));
      IF tx_row.fee > 0 THEN lines := lines || jsonb_build_object('ledger_account', 'platform:fees', 'currency', tx_row.currency, 'debit', 0, 'credit', tx_row.fee); END IF;
    END IF;
    PERFORM public.post_journal(tx_row.user_id, tx_row.id, tx_row.type, lines, jsonb_build_object('source', 'existing_transaction'));
  END LOOP;

  FOR acc_row IN SELECT * FROM public.accounts ORDER BY created_at, id LOOP
    SELECT COALESCE(sum(CASE
      WHEN e.ledger_account LIKE 'account:' || acc_row.id::text || ':%' THEN e.credit - e.debit ELSE 0 END), 0)
    INTO net FROM public.ledger_entries e WHERE e.account_id = acc_row.id;
    opening := round(acc_row.balance - net, 2);
    IF opening <> 0 THEN
      bucket := CASE WHEN acc_row.locked_until IS NOT NULL AND acc_row.locked_until > now() THEN 'reserved' ELSE 'available' END;
      PERFORM public.post_journal(acc_row.user_id, NULL, 'opening_balance', jsonb_build_array(
        jsonb_build_object('ledger_account', CASE WHEN opening > 0 THEN 'opening:legacy' ELSE 'account:' || acc_row.id::text || ':' || bucket END, 'account_id', CASE WHEN opening < 0 THEN acc_row.id END, 'currency', acc_row.currency, 'debit', abs(opening), 'credit', 0),
        jsonb_build_object('ledger_account', CASE WHEN opening > 0 THEN 'account:' || acc_row.id::text || ':' || bucket ELSE 'opening:legacy' END, 'account_id', CASE WHEN opening > 0 THEN acc_row.id END, 'currency', acc_row.currency, 'debit', 0, 'credit', abs(opening))
      ), jsonb_build_object('source', 'non_destructive_reconciliation', 'account_id', acc_row.id));
    END IF;
  END LOOP;
END $$;