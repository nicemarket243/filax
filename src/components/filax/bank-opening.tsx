import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Landmark, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal, PrimaryButton } from "@/components/filax/ui-kit";
import { useI18n } from "@/lib/i18n";
import {
  BANK_CONSENT_VERSION,
  bankStatusLabel,
  isConfirmedBankAccount,
  requestStatusLabel,
  type BankOpeningRequest,
  type PartnerBank,
} from "@/lib/bank-opening";
import { submitBankOpening } from "@/lib/bank-opening.functions";

interface BankOpeningPanelProps {
  userId: string | null;
  kycStatus: string;
  previousBank?: string | null;
}

export function BankOpeningPanel({ userId, kycStatus, previousBank }: BankOpeningPanelProps) {
  const { t } = useI18n();
  const requestOpening = useServerFn(submitBankOpening);
  const [banks, setBanks] = useState<PartnerBank[]>([]);
  const [requests, setRequests] = useState<BankOpeningRequest[]>([]);
  const [loading, setLoading] = useState(!!userId);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<PartnerBank | null>(null);
  const [currencies, setCurrencies] = useState<Array<"USD" | "CDF">>(["USD", "CDF"]);
  const [custody, setCustody] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [clientKey, setClientKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBanks([]);
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    const [bankResult, requestResult] = await Promise.all([
      supabase.from("partner_banks").select("code,name,status,api_opening,sort_order").neq("status", "disabled").order("sort_order"),
      supabase
        .from("account_opening_requests")
        .select("id,bank_code,currencies,status,request_reference,integration_status,external_reference,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (bankResult.error || requestResult.error) setLoadError(true);
    setBanks((bankResult.data ?? []) as PartnerBank[]);
    setRequests(requestResult.data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const close = () => {
    if (busy) return;
    setSelected(null);
    setClientKey(null);
    setCurrencies(["USD", "CDF"]);
    setCustody(false);
    setPrivacy(false);
    setTerms(false);
  };

  const openRequest = (bank: PartnerBank) => {
    setSelected(bank);
    setClientKey(crypto.randomUUID());
  };

  const toggleCurrency = (currency: "USD" | "CDF", checked: boolean) => {
    setCurrencies((current) => checked ? [...current, currency] : current.filter((item) => item !== currency));
  };

  const submit = async () => {
    if (!selected || !clientKey || !currencies.length || !custody || !privacy || !terms) return;
    setBusy(true);
    try {
      await requestOpening({
        data: {
          bankCode: selected.code,
          currencies,
          clientKey,
          consentVersion: BANK_CONSENT_VERSION,
          custodyAcknowledged: true,
          privacyAccepted: true,
          requestTermsAccepted: true,
        },
      });
      await refresh();
      toast.success(t("Demande enregistrée"), {
        description: t("Aucune banque n’a été contactée et aucun compte bancaire n’a été ouvert."),
      });
      setBusy(false);
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Enregistrement impossible"));
    } finally {
      setBusy(false);
    }
  };

  const verified = kycStatus === "verified";
  const latest = requests[0];
  const latestBank = latest ? banks.find((bank) => bank.code === latest.bank_code) : null;

  if (!userId) {
    return (
      <p className="rounded-2xl bg-muted/50 px-3.5 py-3 text-[0.72rem] leading-relaxed text-muted-foreground">
        {t("Connectez-vous pour choisir votre banque et enregistrer une demande.")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {previousBank && !latest && (
        <div className="rounded-2xl border border-border bg-muted/40 px-3.5 py-3">
          <p className="text-[0.65rem] font-semibold text-muted-foreground">{t("Choix précédent")}</p>
          <p className="mt-0.5 text-[0.8rem] font-bold text-foreground">{previousBank}</p>
          <p className="mt-1 text-[0.62rem] text-muted-foreground">{t("Aucune confirmation bancaire associée.")}</p>
        </div>
      )}

      {latest && (
        <div className={`rounded-2xl border px-3.5 py-3 ${isConfirmedBankAccount(latest) ? "border-brand-green/40 bg-brand-green/[0.08]" : "border-brand-blue/25 bg-brand-blue/[0.07]"}`}>
          <div className="flex items-start gap-3">
            {isConfirmedBankAccount(latest) ? <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" /> : <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" />}
            <div className="min-w-0 flex-1">
              <p className="text-[0.8rem] font-bold text-foreground">{latestBank?.name ?? latest.bank_code}</p>
              <p className="mt-0.5 text-[0.65rem] font-semibold text-muted-foreground">{t(requestStatusLabel(latest))}</p>
              <p className="mt-1 break-all text-[0.58rem] text-muted-foreground">{latest.request_reference} · {latest.currencies.join(" + ")}</p>
              {isConfirmedBankAccount(latest) && <p className="mt-1 break-all text-[0.58rem] text-muted-foreground">{latest.external_reference}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2.5 rounded-2xl bg-brand-blue/[0.07] px-3.5 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
        <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
          {t("La banque choisie conservera les fonds après l’ouverture réelle du compte. FILAX organise les comptes et les règles de disponibilité.")}
        </p>
      </div>

      {!verified && (
        <div className="rounded-2xl border border-brand-gold/25 bg-brand-gold/[0.07] px-3.5 py-3">
          <p className="text-[0.68rem] leading-relaxed text-muted-foreground">{t("Terminez la vérification de votre identité avant de choisir une banque.")}</p>
          <Link to="/verification" className="press mt-2 inline-block text-[0.68rem] font-bold text-brand-blue">{t("Vérifier mon identité")}</Link>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-5 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : loadError ? (
        <div className="text-center">
          <p className="text-[0.7rem] text-brand-red">{t("Impossible de charger les banques.")}</p>
          <button type="button" onClick={() => void refresh()} className="press mt-2 text-[0.7rem] font-bold text-brand-blue">{t("Réessayer")}</button>
        </div>
      ) : (
        <div className="space-y-2">
          {banks.map((bank) => (
            <button
              key={bank.code}
              type="button"
              disabled={!verified || busy}
              onClick={() => openRequest(bank)}
              className="press flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-3.5 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-[0.62rem] font-black text-brand-blue">
                {bank.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[0.8rem] font-bold text-foreground">{bank.name}</span>
                <span className="block text-[0.62rem] text-muted-foreground">{t(bankStatusLabel(bank.status))}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={!!selected}
        onOpenChange={(open) => !open && close()}
        title={selected?.name ?? ""}
        subtitle={t("Information et consentement")}
        display="responsive"
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="text-sm font-extrabold text-foreground">{t("Qui conserve les fonds ?")}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("Après l’ouverture effective et la confirmation du compte, les fonds seront conservés par la banque choisie. FILAX ne se présente pas comme l’établissement dépositaire.")}
              </p>
            </div>
            <p className="rounded-2xl border border-brand-gold/25 bg-brand-gold/[0.07] px-3.5 py-3 text-[0.7rem] leading-relaxed text-muted-foreground">
              {t("Dans l’environnement actuel, aucune API bancaire n’est connectée. Cette action enregistre votre demande sans ouvrir de compte et sans transmettre de données à la banque.")}
            </p>

            <div>
              <p className="mb-2 text-[0.72rem] font-semibold text-foreground">{t("Comptes principaux demandés")}</p>
              <div className="grid grid-cols-2 gap-2">
                {(["USD", "CDF"] as const).map((currency) => (
                  <label key={currency} htmlFor={`bank-${currency}`} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground">
                    <Checkbox id={`bank-${currency}`} checked={currencies.includes(currency)} onCheckedChange={(checked) => toggleCurrency(currency, checked === true)} />
                    {currency}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <ConsentCheck id="bank-custody" checked={custody} onChange={setCustody} text={t("Je comprends que la banque conservera les fonds uniquement après l’ouverture effective et la confirmation du compte.")} />
              <ConsentCheck id="bank-privacy" checked={privacy} onChange={setPrivacy} text={t("J’accepte la politique de confidentialité FILAX et l’enregistrement de cette demande. Aucune donnée n’est transmise à une banque dans l’environnement actuel.")} />
              <ConsentCheck id="bank-terms" checked={terms} onChange={setTerms} text={t("J’accepte les conditions applicables à cette demande. Les conditions contractuelles de la banque devront être acceptées avant toute ouverture réelle.")} />
            </div>

            <PrimaryButton disabled={busy || !custody || !privacy || !terms || !currencies.length} onClick={() => void submit()}>
              {busy ? t("Enregistrement…") : t("Enregistrer ma demande")}
            </PrimaryButton>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ConsentCheck({ id, checked, onChange, text }: { id: string; checked: boolean; onChange: (value: boolean) => void; text: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-[0.72rem] leading-relaxed text-muted-foreground">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5 h-5 w-5 rounded-md border-border data-[state=checked]:bg-brand-blue" />
      <span>{text}</span>
    </label>
  );
}
