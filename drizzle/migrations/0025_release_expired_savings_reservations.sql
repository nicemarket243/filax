CREATE OR REPLACE FUNCTION public.release_expired_account_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE released integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non connecté';
  END IF;

  UPDATE public.accounts
  SET available_balance = available_balance + reserved_balance,
      reserved_balance = 0
  WHERE user_id = auth.uid()
    AND locked_until IS NOT NULL
    AND locked_until <= now()
    AND reserved_balance > 0;

  GET DIAGNOSTICS released = ROW_COUNT;
  RETURN released;
END
$$;

REVOKE ALL ON FUNCTION public.release_expired_account_locks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_expired_account_locks() TO authenticated, service_role;

COMMENT ON FUNCTION public.release_expired_account_locks() IS 'Libère uniquement les réserves du compte connecté dont la date de blocage est échue ; aucun solde total ni mouvement financier n’est modifié.';