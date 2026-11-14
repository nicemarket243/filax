DROP POLICY IF EXISTS "fees read" ON public.fee_rules;
CREATE POLICY "fees read active" ON public.fee_rules FOR SELECT TO authenticated USING (active = true AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "banks public read" ON public.partner_banks;
CREATE POLICY "banks read listed" ON public.partner_banks FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND status <> 'disabled');
REVOKE SELECT ON public.partner_banks FROM anon;