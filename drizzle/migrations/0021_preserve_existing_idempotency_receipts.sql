INSERT INTO public.operation_requests(user_id,idempotency_key,fingerprint,operation,state,transaction_id,result,created_at,completed_at)
SELECT t.user_id,t.idempotency_key,
  public.operation_fingerprint(
    CASE WHEN t.type='deposit' THEN 'deposit' WHEN t.method='filax' THEN 'transfer' ELSE 'external' END,
    t.account_id,t.amount,COALESCE(t.counterparty,t.method,''),NULL),
  CASE WHEN t.type='deposit' THEN 'deposit' WHEN t.method='filax' THEN 'transfer' ELSE 'external' END,
  'completed',t.id,
  CASE WHEN t.type='deposit' THEN jsonb_build_object('transaction_id',t.id) ELSE jsonb_build_object('ok',true,'transaction_id',t.id) END,
  t.created_at,COALESCE(t.confirmed_at,t.created_at)
FROM public.transactions t
WHERE t.idempotency_key IS NOT NULL AND t.status IN ('pending','confirmed','refunded')
  AND t.type IN ('deposit','transfer_out')
ON CONFLICT (user_id,idempotency_key) DO NOTHING;