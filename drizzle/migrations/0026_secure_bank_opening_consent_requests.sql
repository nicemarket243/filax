ALTER TABLE public.partner_banks DROP CONSTRAINT IF EXISTS partner_banks_status_check;
ALTER TABLE public.partner_banks ADD CONSTRAINT partner_banks_status_check CHECK (status IN ('preparation','sandbox','active','disabled'));

ALTER TABLE public.account_opening_requests
  ADD COLUMN client_key uuid,
  ADD COLUMN request_reference text NOT NULL DEFAULT ('FBO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))),
  ADD COLUMN consent_version text,
  ADD COLUMN consent_text text,
  ADD COLUMN consent_accepted_at timestamptz,
  ADD COLUMN custody_acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN privacy_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN request_terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN integration_status text NOT NULL DEFAULT 'not_connected',
  ADD COLUMN external_reference text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.account_opening_requests
  ADD CONSTRAINT account_opening_integration_status_check CHECK (integration_status IN ('not_connected','pending','confirmed','failed')),
  ADD CONSTRAINT account_opening_consent_check CHECK (
    (consent_accepted_at IS NULL AND consent_version IS NULL)
    OR
    (consent_accepted_at IS NOT NULL AND consent_version IS NOT NULL AND consent_text IS NOT NULL AND custody_acknowledged AND privacy_accepted AND request_terms_accepted)
  );

CREATE UNIQUE INDEX account_opening_requests_reference_key ON public.account_opening_requests(request_reference);
CREATE UNIQUE INDEX account_opening_requests_user_client_key ON public.account_opening_requests(user_id, client_key) WHERE client_key IS NOT NULL;

DROP POLICY IF EXISTS "own opening create" ON public.account_opening_requests;
REVOKE INSERT ON public.account_opening_requests FROM authenticated;

CREATE OR REPLACE FUNCTION public.submit_bank_opening_request(
  _bank_code text,
  _currencies text[],
  _client_key uuid,
  _consent_version text,
  _custody_acknowledged boolean,
  _privacy_accepted boolean,
  _request_terms_accepted boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_kyc text;
  v_demo boolean;
  v_bank public.partner_banks%ROWTYPE;
  v_request public.account_opening_requests%ROWTYPE;
  v_consent constant text := 'Je comprends que la banque conservera les fonds uniquement après ouverture effective et confirmation du compte. J’accepte la politique de confidentialité FILAX, l’enregistrement de cette demande et ses conditions applicables. Les conditions contractuelles propres à la banque devront être acceptées avant toute ouverture réelle.';
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF _client_key IS NULL THEN RAISE EXCEPTION 'Clé de demande requise'; END IF;
  IF _consent_version IS DISTINCT FROM '2026-11-14.v1' OR NOT COALESCE(_custody_acknowledged, false) OR NOT COALESCE(_privacy_accepted, false) OR NOT COALESCE(_request_terms_accepted, false) THEN
    RAISE EXCEPTION 'Consentements incomplets ou version invalide';
  END IF;
  IF _currencies IS NULL OR cardinality(_currencies) NOT BETWEEN 1 AND 2 OR NOT (_currencies <@ ARRAY['USD','CDF']::text[]) OR (SELECT count(DISTINCT currency) FROM unnest(_currencies) AS currency) <> cardinality(_currencies) THEN
    RAISE EXCEPTION 'Choisissez USD, CDF ou les deux sans doublon';
  END IF;

  SELECT kyc_status, is_demo INTO v_kyc, v_demo FROM public.profiles WHERE user_id = v_user;
  IF NOT FOUND OR (v_kyc IS DISTINCT FROM 'verified' AND NOT COALESCE(v_demo, false)) THEN
    RAISE EXCEPTION 'Vérification d’identité requise avant la demande bancaire';
  END IF;

  SELECT * INTO v_bank FROM public.partner_banks WHERE code = _bank_code AND status <> 'disabled';
  IF NOT FOUND THEN RAISE EXCEPTION 'Banque indisponible'; END IF;
  IF v_bank.status = 'active' AND v_bank.api_opening THEN
    RAISE EXCEPTION 'Connecteur bancaire non configuré : aucune demande transmise';
  END IF;

  SELECT * INTO v_request FROM public.account_opening_requests WHERE user_id = v_user AND client_key = _client_key FOR UPDATE;
  IF FOUND THEN
    IF v_request.bank_code IS DISTINCT FROM _bank_code OR v_request.currencies IS DISTINCT FROM _currencies OR v_request.consent_version IS DISTINCT FROM _consent_version THEN
      RAISE EXCEPTION 'Cette clé de demande a déjà été utilisée avec d’autres informations';
    END IF;
    RETURN to_jsonb(v_request);
  END IF;

  INSERT INTO public.account_opening_requests(
    user_id, bank_code, currencies, status, client_key, consent_version, consent_text,
    consent_accepted_at, custody_acknowledged, privacy_accepted, request_terms_accepted,
    integration_status, updated_at
  ) VALUES (
    v_user, v_bank.code, _currencies, 'submitted', _client_key, _consent_version, v_consent,
    now(), true, true, true, 'not_connected', now()
  ) RETURNING * INTO v_request;

  RETURN to_jsonb(v_request);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_bank_opening_request(text, text[], uuid, text, boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_bank_opening_request(text, text[], uuid, text, boolean, boolean, boolean) TO authenticated, service_role;