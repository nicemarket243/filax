import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/countries";
import { discoveryFilaxId } from "@/lib/filax-id";

export const registrationInput = z.object({
  firstName: z.string().trim().min(2).max(80),
  postNom: z.string().trim().min(2).max(80),
  channel: z.enum(["email", "phone"]),
  country: z.string().trim().length(2).optional(),
  email: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(24).optional(),
}).superRefine((data, context) => {
  if (data.channel === "email" && !z.string().email().safeParse(data.email).success) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Entrez une adresse e-mail valide", path: ["email"] });
  }
  if (data.channel === "phone" && !/^\+[1-9]\d{6,14}$/.test(data.phone ?? "")) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Entrez un numéro de téléphone valide", path: ["phone"] });
  }
});

/** Unproven contacts grant discovery only, never an authenticated session. */
export function discoveryRegistration(input: z.infer<typeof registrationInput>) {
  const data = registrationInput.parse(input);
  if (data.country && !COUNTRY_CODES.includes(data.country as (typeof COUNTRY_CODES)[number])) {
    throw new Error("Ce pays n'est pas encore disponible sur FILAX");
  }
  return {
    ok: true as const,
    access: "discovery" as const,
    contactVerified: false as const,
    discovery: {
      name: `${data.firstName} ${data.postNom}`,
      nom: data.firstName,
      prenom: data.postNom,
      phone: data.channel === "phone" ? data.phone ?? "" : "",
      email: data.channel === "email" ? data.email?.toLowerCase() : undefined,
      country: data.country ?? "CD",
      filaxId: discoveryFilaxId(data.firstName, data.postNom),
    },
  };
}