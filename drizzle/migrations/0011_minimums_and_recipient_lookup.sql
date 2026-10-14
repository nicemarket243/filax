CREATE OR REPLACE FUNCTION public.guard_tx_minimums()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur text; mn numeric;
BEGIN
  IF NEW.type NOT IN ('deposit','withdraw') THEN RETURN NEW; END IF;
  SELECT currency INTO cur FROM accounts WHERE id = NEW.account_id;
  IF NEW.method = 'carte' THEN
    mn := CASE WHEN NEW.type='deposit' THEN 2 ELSE 10 END;
    IF cur = 'CDF' THEN mn := NULL; END IF;
  ELSIF NEW.method IN ('orange','airtel','mpesa') THEN
    IF cur = 'CDF' THEN mn := CASE WHEN NEW.type='deposit' THEN 2500 ELSE 3500 END;
    ELSE mn := CASE WHEN NEW.type='deposit' THEN 1 ELSE 2 END; END IF;
  END IF;
  IF mn IS NOT NULL AND abs(NEW.amount) < mn THEN
    RAISE EXCEPTION 'Montant minimum : % %', mn, cur;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS transactions_minimums ON public.transactions;
CREATE TRIGGER transactions_minimums BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.guard_tx_minimums();

CREATE OR REPLACE FUNCTION public.find_recipient(_identifier text)
RETURNS TABLE(name text, filax_id text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), p.filax_id
  FROM profiles p
  WHERE auth.uid() IS NOT NULL AND p.user_id <> auth.uid() AND p.filax_id IS NOT NULL
    AND length(trim(_identifier)) >= 5
    AND (upper(p.filax_id) = upper(trim(_identifier))
      OR lower(p.email) = lower(trim(_identifier))
      OR regexp_replace(coalesce(p.phone,''),'\D','','g') = regexp_replace(_identifier,'\D','','g'))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.find_recipient(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.find_recipient(text) TO authenticated;