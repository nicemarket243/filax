import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export const COUNTRY_GROUPS: { label: string; codes: CountryCode[] }[] = [
  { label: "Afrique", codes: ["CD", "CG", "CM", "CI", "SN", "GA", "KE", "NG", "RW", "GH", "TG", "BJ", "ML", "BF", "GN", "UG", "TZ", "ZA", "AO", "ZM", "MW", "MZ", "MG", "ET", "EG", "MA", "TN", "DZ", "SL", "LR"] },
  { label: "Europe", codes: ["FR", "BE", "CH", "DE", "GB", "IT", "ES", "NL", "PT", "SE", "NO", "DK", "IE", "LU", "AT"] },
  { label: "Amérique", codes: ["US", "CA", "BR", "MX", "CO", "AR", "CL", "PE", "EC", "BO", "UY", "PY", "VE", "DO", "HT"] },
  { label: "Asie", codes: ["CN", "AE", "QA", "TR", "IN", "JP", "KR", "SG", "MY", "SA"] },
];
export const COUNTRY_CODES = COUNTRY_GROUPS.flatMap((g) => g.codes);
export const countryFlag = (code: string) => String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
export const callingCode = (code: CountryCode) => `+${getCountryCallingCode(code)}`;
export function internationalPhone(value: string, country: CountryCode) {
  const parsed = parsePhoneNumberFromString(value, country);
  return parsed?.isValid() ? parsed.number : null;
}
export type { CountryCode };