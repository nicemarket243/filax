import { z } from "zod";

export const BANK_CONSENT_VERSION = "2026-11-14.v1";

export const bankOpeningSchema = z.object({
  bankCode: z.string().trim().min(2).max(30),
  currencies: z
    .array(z.enum(["USD", "CDF"]))
    .min(1)
    .max(2)
    .refine((values) => new Set(values).size === values.length, "Devises en double"),
  clientKey: z.string().uuid(),
  consentVersion: z.literal(BANK_CONSENT_VERSION),
  custodyAcknowledged: z.literal(true),
  privacyAccepted: z.literal(true),
  requestTermsAccepted: z.literal(true),
});

export type BankOpeningInput = z.infer<typeof bankOpeningSchema>;

export const bankOpeningResponseSchema = z.object({
  id: z.string().uuid(),
  bank_code: z.string(),
  currencies: z.array(z.enum(["USD", "CDF"])),
  status: z.string(),
  request_reference: z.string(),
  integration_status: z.string(),
  external_reference: z.string().nullable(),
  consent_version: z.string().nullable(),
  consent_accepted_at: z.string().nullable(),
  created_at: z.string(),
});

export interface PartnerBank {
  code: string;
  name: string;
  status: "preparation" | "sandbox" | "active" | "disabled" | string;
  api_opening: boolean;
  sort_order: number;
}

export interface BankOpeningRequest {
  id: string;
  bank_code: string;
  currencies: string[];
  status: string;
  request_reference: string;
  integration_status: string;
  external_reference: string | null;
  created_at: string;
}

/** A request never proves a bank account exists without both bank confirmation and its reference. */
export function isConfirmedBankAccount(request: Pick<BankOpeningRequest, "status" | "integration_status" | "external_reference">) {
  return request.status === "approved" && request.integration_status === "confirmed" && !!request.external_reference?.trim();
}

export function bankStatusLabel(status: string) {
  if (status === "sandbox") return "Sandbox";
  if (status === "active") return "Partenariat validé";
  if (status === "disabled") return "Indisponible";
  return "En préparation";
}

export function requestStatusLabel(request: BankOpeningRequest) {
  if (isConfirmedBankAccount(request)) return "Compte bancaire confirmé";
  if (request.status === "rejected") return "Demande refusée";
  if (request.integration_status === "failed") return "Échec de la connexion bancaire";
  if (request.integration_status === "pending") return "En attente de la banque";
  return "Demande enregistrée — banque non connectée";
}
