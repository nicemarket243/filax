CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  vendor text NOT NULL DEFAULT '',
  expense_date date,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0 AND amount <= 1000000000000),
  currency text NOT NULL DEFAULT 'USD',
  category text NOT NULL DEFAULT 'Autre',
  description text,
  doc_type text NOT NULL DEFAULT 'reçu',
  file_path text,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expenses_user_idx ON public.expenses(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own expenses read" ON public.expenses FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own expenses insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own expenses update" ON public.expenses FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own expenses delete" ON public.expenses FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own receipts read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own receipts insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own receipts delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);