CREATE OR REPLACE FUNCTION public.admin_list_clients()
RETURNS TABLE(user_id uuid, first_name text, last_name text, email text, phone text, filax_id text, kyc_status text, created_at timestamptz, accounts jsonb, groups_count bigint, tx_count bigint, last_tx_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT p.user_id, p.first_name, p.last_name, p.email, p.phone, p.filax_id, p.kyc_status, p.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('name', a.name, 'currency', a.currency, 'balance', a.balance, 'status', a.status) ORDER BY a.created_at) FROM public.accounts a WHERE a.user_id = p.user_id), '[]'::jsonb),
    (SELECT count(*) FROM public.group_members m WHERE m.user_id = p.user_id),
    (SELECT count(*) FROM public.transactions t WHERE t.user_id = p.user_id),
    (SELECT max(t.created_at) FROM public.transactions t WHERE t.user_id = p.user_id)
  FROM public.profiles p ORDER BY p.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_client_detail(_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN jsonb_build_object(
    'groups', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', g.name, 'category', g.category, 'currency', g.currency, 'collected', g.collected, 'target', g.target, 'owner', g.owner_id = _user, 'members', (SELECT count(*) FROM public.group_members x WHERE x.group_id = g.id)) ORDER BY g.created_at DESC)
      FROM public.groups g JOIN public.group_members m ON m.group_id = g.id AND m.user_id = _user), '[]'::jsonb),
    'transactions', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM (
      SELECT t.type, t.amount, t.fee, t.method, t.label, t.created_at, a.currency, a.name AS account
      FROM public.transactions t JOIN public.accounts a ON a.id = t.account_id
      WHERE t.user_id = _user ORDER BY t.created_at DESC LIMIT 100) s), '[]'::jsonb)
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_clients() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_client_detail(uuid) FROM anon;