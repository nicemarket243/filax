import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { bankOpeningResponseSchema, bankOpeningSchema } from "@/lib/bank-opening";

/**
 * Records only the user's request and consent. No bank HTTP call is made here:
 * a real connector can be enabled only after its contract, documentation and credentials are validated.
 */
export const submitBankOpening = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bankOpeningSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: request, error } = await context.supabase.rpc("submit_bank_opening_request", {
      _bank_code: data.bankCode,
      _currencies: data.currencies,
      _client_key: data.clientKey,
      _consent_version: data.consentVersion,
      _custody_acknowledged: data.custodyAcknowledged,
      _privacy_accepted: data.privacyAccepted,
      _request_terms_accepted: data.requestTermsAccepted,
    });
    if (error) throw new Error(error.message);
    return bankOpeningResponseSchema.parse(request);
  });
