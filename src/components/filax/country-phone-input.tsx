import { useEffect, useRef, useState } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { COUNTRY_CODES, COUNTRY_GROUPS, callingCode, countryFlag, type CountryCode } from "@/lib/countries";
import { useI18n } from "@/lib/i18n";

export function usePhoneCountry() {
  const [country, setCountry] = useState<CountryCode>("CD");
  const manual = useRef(false);
  const chooseCountry = (value: CountryCode) => { manual.current = true; setCountry(value); };
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    // Country only: no GPS permission, coordinates or account data are sent or stored.
    void fetch("https://ipwho.is/?fields=success,country_code", { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { success?: boolean; country_code?: string } | null) => {
        const code = data?.country_code as CountryCode | undefined;
        if (data?.success && code && COUNTRY_CODES.includes(code) && !manual.current) setCountry(code);
      }).catch(() => { /* RDC remains the safe, editable fallback. */ })
      .finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);
  return { country, chooseCountry };
}

export function CountryPhoneInput({ country, onCountryChange, phone, onPhoneChange, disabled = false }: {
  country: CountryCode; onCountryChange: (value: CountryCode) => void;
  phone: string; onPhoneChange: (value: string) => void; disabled?: boolean;
}) {
  const { lang, t } = useI18n();
  const names = new Intl.DisplayNames([lang], { type: "region" });
  return <div className="space-y-2">
    <Select value={country} onValueChange={(value) => onCountryChange(value as CountryCode)} disabled={disabled}>
      <SelectTrigger aria-label={t("Pays / indicatif téléphonique")} className="h-12 w-full rounded-xl border-border/70 text-left">
        <SelectValue><span className="flex min-w-0 items-center gap-2"><span aria-hidden="true">{countryFlag(country)}</span><span className="truncate">{names.of(country)}</span><span className="shrink-0 text-muted-foreground">{callingCode(country)}</span></span></SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80 max-w-[calc(100vw-3rem)]">
        <SelectGroup><SelectLabel>{t("À la une")}</SelectLabel><SelectItem value="CD">{countryFlag("CD")} {names.of("CD")} +243</SelectItem></SelectGroup>
        {COUNTRY_GROUPS.map((group) => <SelectGroup key={group.label}>
          <SelectLabel>{t(group.label)}</SelectLabel>
          {group.codes.filter((c) => c !== "CD").map((c) => <SelectItem key={c} value={c}>{countryFlag(c)} {names.of(c)} {callingCode(c)}</SelectItem>)}
        </SelectGroup>)}
      </SelectContent>
    </Select>
    <Input id="filax-phone" aria-label={t("Téléphone")} type="tel" autoComplete="tel-national" inputMode="tel" placeholder={t("Numéro de téléphone")} value={phone} disabled={disabled} maxLength={24}
      onChange={(e) => {
        const value = e.target.value.replace(/[^\d+\s()-]/g, "");
        if (value.startsWith("+") || value.startsWith("00")) {
          const parsed = parsePhoneNumberFromString(value.replace(/^00/, "+"));
          if (parsed?.country && COUNTRY_CODES.includes(parsed.country)) { onCountryChange(parsed.country); onPhoneChange(parsed.nationalNumber); return; }
        }
        onCountryChange(country); // Typing prevents a late IP response from changing the prefix.
        onPhoneChange(value);
      }} className="h-12 rounded-xl border-border/70 bg-transparent px-4 text-sm" />
  </div>;
}