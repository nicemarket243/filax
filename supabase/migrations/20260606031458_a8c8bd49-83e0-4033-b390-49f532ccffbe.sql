CREATE POLICY "Users manage their own KYC files - select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage their own KYC files - insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage their own KYC files - update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage their own KYC files - delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);