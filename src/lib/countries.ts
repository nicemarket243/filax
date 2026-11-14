import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export const COUNTRY_GROUPS: { label: string; codes: CountryCode[] }[] = [
  { label: "Afrique", codes: ["CD", "CG", "AO", "ZA", "NG", "KE", "TZ", "UG", "RW", "CM", "CI", "SN", "GH", "GA", "ZM", "EG", "MA", "DZ", "MZ", "ET"] },
  { label: "Amérique", codes: ["US", "CA", "BR", "MX", "CO", "AR", "CL", "PE", "EC", "DO"] },
  { label: "Asie", codes: ["CN", "AE", "IN", "JP", "KR", "SG", "MY", "SA", "QA", "TR"] },
  { label: "Europe", codes: ["FR", "BE", "GB", "CH", "DE", "IT", "ES", "NL", "PT", "LU"] },
];
export const COUNTRY_CODES = COUNTRY_GROUPS.flatMap((g) => g.codes);
export const countryFlag = (code: string) => String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
export const callingCode = (code: CountryCode) => `+${getCountryCallingCode(code)}`;
export function internationalPhone(value: string, country: CountryCode) {
  const parsed = parsePhoneNumberFromString(value, country);
  return parsed?.isValid() ? parsed.number : null;
}
export type { CountryCode };