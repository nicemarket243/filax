CREATE TABLE public.partner_banks (
  code text PRIMARY KEY,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'preparation' CHECK (status IN ('preparation','sandbox','active')),
  api_opening boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_banks TO anon, authenticated;
GRANT ALL ON public.partner_banks TO service_role;
ALTER TABLE public.partner_banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banks public read" ON public.partner_banks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage banks" ON public.partner_banks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.partner_banks TO authenticated;
INSERT INTO public.partner_banks(code,name,sort_order) VALUES
 ('EQUITY','Equity BCDC',1),('RAWBANK','Rawbank',2),('ECOBANK','Ecobank',3),
 ('SOFIBANQUE','Sofibanque',4),('UBA','UBA',5),('ACCESS','Access Bank',6);

CREATE TABLE public.account_opening_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  bank_code text NOT NULL REFERENCES public.partner_banks(code),
  currencies text[] NOT NULL CHECK (currencies <@ ARRAY['USD','CDF'] AND cardinality(currencies) BETWEEN 1 AND 2),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','alternative','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.account_opening_requests TO authenticated;
GRANT ALL ON public.account_opening_requests TO service_role;
ALTER TABLE public.account_opening_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own opening read" ON public.account_opening_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own opening create" ON public.account_opening_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status IN ('submitted','alternative'));

CREATE TABLE public.fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL,
  method text,
  partner text,
  currency text,
  fixed numeric NOT NULL DEFAULT 0 CHECK (fixed >= 0),
  percent numeric NOT NULL DEFAULT 0 CHECK (percent >= 0 AND percent <= 100),
  min_fee numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fee_rules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fee_rules TO authenticated;
GRANT ALL ON public.fee_rules TO service_role;
ALTER TABLE public.fee_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fees read" ON public.fee_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage fees" ON public.fee_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.fee_rules(operation, percent, min_fee) VALUES ('*', 0.5, 0.10);