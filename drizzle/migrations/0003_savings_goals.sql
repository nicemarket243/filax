CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  target numeric NOT NULL CHECK (target > 0),
  saved numeric NOT NULL DEFAULT 0,
  deadline date,
  icon text NOT NULL DEFAULT 'target',
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals read" ON public.goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own goals create" ON public.goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND saved = 0 AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.fund_goal(_goal uuid, _from uuid, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE g public.goals; acc public.accounts;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  SELECT * INTO g FROM public.goals WHERE id = _goal AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Objectif introuvable'; END IF;
  SELECT * INTO acc FROM public.accounts WHERE id = _from AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
  IF acc.currency <> g.currency THEN RAISE EXCEPTION 'Devise différente de l''objectif'; END IF;
  IF acc.status <> 'active' OR (acc.locked_until IS NOT NULL AND acc.locked_until > now()) THEN RAISE EXCEPTION 'Compte bloqué'; END IF;
  IF acc.balance < _amount THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  UPDATE public.accounts SET balance = balance - _amount WHERE id = _from;
  UPDATE public.goals SET saved = saved + _amount WHERE id = _goal;
  INSERT INTO public.transactions(user_id, account_id, type, amount, method, label, counterparty)
  VALUES (auth.uid(), _from, 'goal_fund', _amount, 'filax', 'Épargne · ' || g.name, g.name);
END $$;
REVOKE EXECUTE ON FUNCTION public.fund_goal(uuid, uuid, numeric) FROM anon;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;