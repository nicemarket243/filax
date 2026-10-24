import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, QrCode, Search, Share2 } from "lucide-react";

import {
  ACCENTS,
  ACCOUNT_ICONS,
  GROUP_ICONS,
  METHOD_LABEL,
  MOBILE_MONEY,
  formatMoney,
  isLocked,
  useFilax,
  type AccentKey,
  type Account,
  type Currency,
  type Goal,
  type Group,
  type TxMethod,
} from "@/lib/filax-store";

import { Field, Modal, PrimaryButton, TextInput, accentVar } from "@/components/filax/ui-kit";
import { VisualPicker } from "./visual-picker";
import { subaccountSchema, type SubaccountInput } from "@/lib/filax-db";
import { PinConfirmModal } from "./pin-confirm";
import { TransactionDemoLauncher } from "./payment-simulators";
import { TransactionReview } from "./transaction-review";
import { canReviewOutflow, canValidateDeposit, transactionFee } from "@/lib/transaction-review";
import { QrScanModal, ReceiveQrModal } from "@/components/filax/qr-scanner";


function AccountSelect({
  accounts,
  value,
  onChange,
  hideLocked = false,
}: {
  accounts: Account[];
  value: string;
  onChange: (v: string) => void;
  hideLocked?: boolean;
}) {
  const list = hideLocked ? accounts.filter((a) => !isLocked(a)) : accounts;
  return (
    <Field label="Compte">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand-blue"
      >
        {list.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} — {formatMoney(a.balance, a.currency)}
          </option>
        ))}
      </select>
    </Field>
  );
}

function MethodPicker({ value, onChange }: { value: TxMethod; onChange: (m: TxMethod) => void }) {
  return (
    <Field label="Moyen">
      <div className="grid grid-cols-2 gap-2">
        {MOBILE_MONEY.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`press rounded-xl border px-3 py-2.5 text-left text-[0.72rem] font-semibold ${
              value === m.id ? "border-transparent text-white" : "border-border bg-background text-foreground"
            }`}
            style={value === m.id ? { backgroundColor: accentVar(m.color) } : undefined}
          >
            {m.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

function useAmount(open: boolean) {
  const [amount, setAmount] = useState("");
  useEffect(() => {
    if (!open) setAmount("");
  }, [open]);
  return [amount, setAmount, Number(amount) || 0] as const;
}

/** Seuils minima (aussi vérifiés côté base). */
function minimumFor(kind: "deposit" | "withdraw", method: TxMethod, currency: Currency | undefined): number | null {
  if (method === "carte") return currency === "CDF" ? null : kind === "deposit" ? 2 : 10;
  if (method === "orange" || method === "airtel" || method === "mpesa") {
    if (currency === "CDF") return kind === "deposit" ? 2500 : 3500;
    return kind === "deposit" ? 1 : 2;
  }
  return null;
}
function MinError({ min, currency, value }: { min: number | null; currency?: Currency; value: number }) {
  if (min === null || value <= 0 || value >= min || !currency) return null;
  return <p role="alert" className="mt-1.5 text-[0.68rem] font-semibold text-brand-red">Montant minimum : {formatMoney(min, currency)}</p>;
}

/* ---------------- Dépôt ---------------- */

export function DepositModal({
  open,
  onOpenChange,
  accounts,
  defaultAccountId,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: Account[];
  defaultAccountId: string;
  onConfirm: (accountId: string, amount: number, method: TxMethod) => void | Promise<void>;
}) {
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [method, setMethod] = useState<TxMethod>("mpesa");
  const [amount, setAmount, value] = useAmount(open);
  const { data } = useFilax();
  const [phone, setPhone] = useState("");
  const [validated, setValidated] = useState(false);
  useEffect(() => {
    setAccountId(defaultAccountId);
    setPhone(data.profile.phone ?? "");
    setValidated(false);
  }, [defaultAccountId, open, data.profile.phone]);
  const account = accounts.find((a) => a.id === accountId);
  const depMin = minimumFor("deposit", method, account?.currency);
  const ready = !!account && canValidateDeposit(value, phone, depMin);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={validated ? "Validation de dépôt simulée" : "Déposer de l'argent"}>
      {validated ? <div className="space-y-4">
        <p role="status" className="text-sm text-foreground">Prestataire non connecté : aucun paiement envoyé et aucun solde crédité.</p>
        <p className="text-sm text-foreground">{METHOD_LABEL[method]} · {phone} · {formatMoney(value, account?.currency ?? "USD")}</p>
        <PrimaryButton onClick={() => onOpenChange(false)}>Terminer</PrimaryButton>
      </div> : <div className="space-y-4">
        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />
        <MethodPicker value={method} onChange={setMethod} />
        <Field label="Numéro de téléphone">
          <TextInput type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243…" />
        </Field>
        {data.profile.phone && <PrimaryButton onClick={() => setPhone(data.profile.phone)}>Utiliser mon numéro</PrimaryButton>}
        <Field label="Montant">
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <MinError min={depMin} currency={account?.currency} value={value} />
        </Field>
        <PrimaryButton color="brand-green" disabled={!ready} onClick={() => setValidated(true)}>Confirmer le dépôt</PrimaryButton>
        <TransactionDemoLauncher kind="deposit" />
      </div>}
    </Modal>
  );
}


/* ---------------- Retrait ---------------- */

export function WithdrawModal({
  open,
  onOpenChange,
  accounts,
  defaultAccountId,
  onConfirm,
  requirePin,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: Account[];
  defaultAccountId: string;
  onConfirm: (accountId: string, amount: number, method: TxMethod, accountPin?: string, globalPin?: string) => void | Promise<void>;
  requirePin?: boolean;
}) {
  const { data } = useFilax();
  const available = accounts.filter((a) => !isLocked(a));
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [accountPin, setAccountPin] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  useEffect(() => setAccountPin(""), [open, accountId]);
  const [phone, setPhone] = useState("");
  const [reviewPin, setReviewPin] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    setPhone(data.profile.phone ?? ""); setReviewPin(""); setReviewOpen(false); setPinOpen(false); setUnavailable(false);
  }, [open, data.profile.phone]);
  const review = async (pin: string) => {
    if (!account || !canReviewOutflow(value, account.balance, pin, phone)) return;
    setReviewPin(pin); setPinOpen(false); setReviewOpen(true);
  };
  const needsAccountPin = !!accounts.find((a) => a.id === accountId)?.hasDedicatedPin;
  const accountPinReady = !needsAccountPin || /^\d{4}$/.test(accountPin);
  const [method, setMethod] = useState<TxMethod>("orange");
  const [amount, setAmount, value] = useAmount(open);

  useEffect(() => {
    const ok = available.some((a) => a.id === defaultAccountId);
    setAccountId(ok ? defaultAccountId : (available[0]?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAccountId, open]);

  const account = accounts.find((a) => a.id === accountId);
  const tooMuch = !!account && value > 0 && value + transactionFee(value) > account.balance;
  const wMin = minimumFor("withdraw", method, account?.currency);
  const belowMin = wMin !== null && value > 0 && value < wMin;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Retirer de l'argent" subtitle="Mobile Money, banque partenaire, carte ou QR code">
      <div className="space-y-4">
        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} hideLocked />
        {needsAccountPin && <Field label="Code du sous-compte (4 chiffres)"><TextInput type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={accountPin} onChange={(e) => setAccountPin(e.target.value.replace(/\D/g, ""))} /></Field>}
        <MethodPicker value={method} onChange={setMethod} />
        <Field label="Numéro de destination"><TextInput type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243…" /></Field>
        {data.profile.phone && <PrimaryButton onClick={() => setPhone(data.profile.phone)}>Utiliser mon numéro</PrimaryButton>}

        <Field label="Montant">
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <MinError min={wMin} currency={account?.currency} value={value} />
        </Field>
        {tooMuch && <p role="alert" className="rounded-xl border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-[0.72rem] font-bold text-brand-red">Votre montant de retrait est supérieur au solde disponible sur ce compte.</p>}
        <PrimaryButton
          color="brand-red"
          disabled={!accountPinReady || !canValidateDeposit(value, phone, wMin) || tooMuch || belowMin || !accountId}
          onClick={() => setPinOpen(true)}
        >
          Confirmer le retrait
        </PrimaryButton>
        <TransactionDemoLauncher kind="withdraw" />
      </div>
      <PinConfirmModal open={open && pinOpen} onOpenChange={setPinOpen} onSubmit={review} />
      <TransactionReview open={open && reviewOpen} onOpenChange={(o) => { setReviewOpen(o); if (!o) setReviewPin(""); }} amount={value} currency={account?.currency ?? "USD"} account={account?.name ?? ""} recipient={phone} method={METHOD_LABEL[method]} onConfirm={() => {
        if (!account || !canReviewOutflow(value, account.balance, reviewPin, phone)) return;
        setReviewOpen(false); setReviewPin(""); setUnavailable(true);
      }} />
      <Modal open={open && unavailable} onOpenChange={setUnavailable} title="Retrait indisponible">
        <p role="status" className="mb-4 text-sm text-foreground">Prestataire non connecté : aucun retrait envoyé et aucun solde débité.</p>
        <PrimaryButton onClick={() => onOpenChange(false)}>Terminer</PrimaryButton>
      </Modal>
    </Modal>
  );
}

/* ---------------- Transfert ---------------- */

const DIRECTORY = [
  { name: "Grace Mukendi", id: "FLX-1029-GM", phone: "+243 815 220 110" },
  { name: "Patrick Lukusa", id: "FLX-3391-PL", phone: "+243 819 771 004" },
  { name: "Sarah Kabeya", id: "FLX-7734-SK", phone: "+243 990 118 226" },
  { name: "David Tshimanga", id: "FLX-5580-DT", phone: "+243 822 445 909" },
];

export function TransferModal({
  open,
  onOpenChange,
  accounts,
  defaultAccountId,
  onConfirm,
  requirePin,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: Account[];
  defaultAccountId: string;
  onConfirm: (accountId: string, amount: number, recipient: string, extra?: { filaxId?: string; pin?: string; accountPin?: string; external?: boolean }) => void | Promise<void>;
  /** Mode base réelle : demande le code secret et accepte un ID FILAX saisi. */
  requirePin?: boolean;
}) {
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [accountPin, setAccountPin] = useState("");
  useEffect(() => setAccountPin(""), [open, accountId]);
  const needsAccountPin = !!accounts.find((a) => a.id === accountId)?.hasDedicatedPin;
  const accountPinReady = !needsAccountPin || /^\d{4}$/.test(accountPin);
  const [mode, setMode] = useState<"filax" | "bank">("filax");
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState<(typeof DIRECTORY)[number] | null>(null);
  const [scan, setScan] = useState(false);
  const [amount, setAmount, value] = useAmount(open);

  useEffect(() => {
    setAccountId(defaultAccountId);
    if (!open) {
      setQuery("");
      setRecipient(null);
      setMode("filax");

    }
  }, [defaultAccountId, open]);

  // Mode réel : recherche d'un vrai membre par ID FILAX, téléphone ou e-mail.
  const [found, setFound] = useState<(typeof DIRECTORY)[number] | null>(null);
  useEffect(() => {
    setFound(null);
    const q = query.trim();
    if (!open || !requirePin || q.length < 5) return;
    let alive = true;
    const t = setTimeout(async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.rpc("find_recipient", { _identifier: q });
      const r = (data as { name: string; filax_id: string }[] | null)?.[0];
      if (alive && r) setFound({ name: r.name || r.filax_id, id: r.filax_id, phone: "Membre FILAX vérifié" });
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [query, requirePin, open]);
  const results = requirePin
    ? (found ? [found] : [])
    : query
      ? DIRECTORY.filter((d) => [d.name, d.id, d.phone].some((f) => f.toLowerCase().includes(query.toLowerCase())))
      : [];

  const [pinOpen, setPinOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewPin, setReviewPin] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPinOpen(false); setReviewOpen(false); setReviewPin(""); }, [open]);
  const sendWith = async (pin: string) => {
    if (busy || !source || !canReviewOutflow(value, source.balance, pin, recipient?.name ?? "")) return;
    setBusy(true);
    const label = recipient?.name ?? "";
    try {
      await onConfirm(accountId, value, label, { filaxId: recipient?.id, pin, accountPin });
    } catch (e) {
      toast.error("Transfert échoué", { description: (e as Error).message });
      setReviewOpen(false); setReviewPin("");
      return;
    } finally { setBusy(false); }
    setReviewOpen(false); setReviewPin("");
    setPinOpen(false);
    onOpenChange(false);
    toast.success("Transfert réussi", { description: `Votre transfert vers ${label} a réussi avec succès.` });
  };
  const source = accounts.find((a) => a.id === accountId);
  const ready = mode === "filax" && !!source && accountPinReady && Number.isFinite(value) && value > 0 && value + transactionFee(value) <= source.balance && !!recipient;
  const prepareReview = async (pin: string) => {
    if (!source || !canReviewOutflow(value, source.balance, pin, recipient?.name ?? "")) return;
    setPinOpen(false); setReviewPin(pin); setReviewOpen(true);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Envoyer de l'argent" subtitle="Vers un membre FILAX, une autre banque ou une carte">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
          {([
            ["filax", "Membre FILAX"],
            ["bank", "Autre banque / carte"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`press rounded-lg py-2 text-[0.72rem] font-bold ${
                mode === id ? "bg-surface text-foreground soft-shadow" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "filax" ? (
          <>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[0.7rem] font-semibold text-muted-foreground">Destinataire</span>
                <button
                  type="button"
                  aria-label="Scanner un QR code"
                  onClick={() => setScan(true)}
                  className="press flex h-7 w-7 items-center justify-center rounded-lg border border-border text-brand-blue"
                >
                  <QrCode className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <TextInput
                  className="pl-9"
                  placeholder="Grace, FLX-1029-GM, +243…"
                  value={recipient ? recipient.name : query}
                  onChange={(e) => {
                    setRecipient(null);
                    setQuery(e.target.value);
                  }}
                />
              </div>
            </div>

            {recipient ? (
              <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
                <Check className="h-4 w-4 text-brand-green" />
                <div className="leading-tight">
                  <p className="text-[0.78rem] font-bold text-foreground">{recipient.name}</p>
                  <p className="text-[0.65rem] text-muted-foreground">
                    {recipient.id} · {recipient.phone}
                  </p>
                </div>
              </div>
            ) : (
              <>
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRecipient(r)}
                  className="press flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left"
                >
                  <span className="text-[0.78rem] font-semibold text-foreground">{r.name}</span>
                  <span className="text-[0.65rem] text-muted-foreground">{r.id}</span>
                </button>
              ))}
              </>
            )}
          </>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">Les transferts externes sont indisponibles tant que le prestataire n’est pas connecté.</p>
        )}

        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} hideLocked />
        {needsAccountPin && <Field label="Code du sous-compte (4 chiffres)"><TextInput type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={accountPin} onChange={(e) => setAccountPin(e.target.value.replace(/\D/g, ""))} /></Field>}
        <Field label="Montant">
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>

        <PrimaryButton
          disabled={!ready}
          onClick={() => {
            if (mode === "filax" && !recipient) return;
            setPinOpen(true);
          }}
        >
          Envoyer maintenant
        </PrimaryButton>
      </div>
      <PinConfirmModal open={open && pinOpen} onOpenChange={setPinOpen} onSubmit={prepareReview} />
      <TransactionReview open={open && reviewOpen} onOpenChange={(o) => { if (!busy) { setReviewOpen(o); if (!o) setReviewPin(""); } }} amount={value} currency={source?.currency ?? "USD"} account={source?.name ?? ""} recipient={`${recipient?.name ?? ""} · ${recipient?.id ?? ""}`} method="Membre FILAX" busy={busy} onConfirm={() => void sendWith(reviewPin)} />

      <QrScanModal
        open={scan}
        onOpenChange={setScan}
        onResult={(v) => {
          if (requirePin) { setRecipient(null); setQuery(v); return; }
          const found = DIRECTORY.find((d) => d.id.toLowerCase() === v.toLowerCase());
          if (found) {
            setRecipient(found);
            toast.success("Destinataire identifié", { description: `${found.name} · ${found.id}` });
          } else {
            setRecipient(null); setQuery(v);
          }
        }}
      />
    </Modal>
  );
}



/* ---------------- Créer un compte ---------------- */

const LOCK_OPTIONS: [number, string][] = [
  [0, "Épargne libre (sans blocage)"], [7, "7 jours"], [30, "1 mois"], [90, "3 mois"], [180, "6 mois"],
  [365, "1 an"], [730, "2 ans"], [1095, "3 ans"], [1825, "5 ans"],
];

export function NewAccountModal({ open, onOpenChange, onConfirm, accounts, defaultParentId }: {
  open: boolean; onOpenChange: (o: boolean) => void; accounts: Account[]; defaultParentId?: string;
  onConfirm: (a: SubaccountInput) => void | Promise<void>;
}) {
  const principals = accounts.filter((a) => a.kind === "main" || /principal|courant/i.test(a.name));
  const [parentId, setParentId] = useState("");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [pin, setPin] = useState("");
  const [visualKey, setVisualKey] = useState("bank-modern");
  const [color, setColor] = useState<AccentKey>("brand-blue");
  const [lockDays, setLockDays] = useState(0);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setParentId(principals.find((a) => a.id === defaultParentId)?.id ?? principals[0]?.id ?? ""); setName(""); setTarget(""); setPin(""); setLockDays(0); setStep(0); } }, [open, defaultParentId]);
  const parent = principals.find((a) => a.id === parentId);
  const subCount = accounts.filter((a) => a.kind && a.kind !== "main").length;
  const lockEnd = lockDays ? Date.now() + lockDays * 86_400_000 : null;
  const valid = !!parent && subCount < 10 && name.trim().length >= 2 && name.trim().length <= 80 && Number(target) > 0 && Number(target) <= 1000000000000 && /^\d{4}$/.test(pin);
  const create = async () => {
    if (!parent || busy) return;
    setBusy(true);
    try { const input = subaccountSchema.parse({ name, parentAccountId: parent.id, currency: parent.currency, target: Number(target), pin, visualKey, icon: "wallet", color, lockedUntil: lockEnd }); await onConfirm(input); setPin(""); onOpenChange(false); toast.success(lockEnd ? "Sous-compte créé et verrouillé" : "Sous-compte créé"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Création impossible"); setStep(0); }
    finally { setBusy(false); }
  };
  if (step > 0) {
    return <Modal open={open} onOpenChange={onOpenChange} title={step === 1 ? "Confirmer le blocage" : "Engagement définitif"}>
      <div className="space-y-4">
        {step === 1 ? (
          <p className="text-sm text-foreground">Voulez-vous confirmer le blocage de ces fonds pour la durée sélectionnée ?<br /><span className="text-muted-foreground">Jusqu'au {new Date(lockEnd!).toLocaleDateString("fr-FR")}.</span></p>
        ) : (
          <p role="alert" className="rounded-xl border border-brand-red/40 bg-brand-red/10 p-3 text-sm font-semibold text-brand-red">Attention : En confirmant ce verrouillage, aucun retour en arrière n'est possible. Vos fonds seront strictement inaccessibles jusqu'à la date d'échéance.</p>
        )}
        <div className="flex gap-2">
          <button type="button" className="press flex-1 rounded-xl border border-border py-3 text-sm font-bold text-muted-foreground" onClick={() => setStep(0)}>Annuler</button>
          <div className="flex-1">{step === 1
            ? <PrimaryButton onClick={() => setStep(2)}>Confirmer</PrimaryButton>
            : <PrimaryButton color="brand-red" disabled={busy} onClick={create}>{busy ? "Verrouillage…" : "J'accepte définitivement"}</PrimaryButton>}</div>
        </div>
      </div>
    </Modal>;
  }
  return <Modal open={open} onOpenChange={onOpenChange} title="Créer un sous-compte">
    <div className="space-y-4">
      <Field label="Compte Principal de rattachement"><select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground">{principals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
      {!parent && <p className="text-sm text-destructive">Choisissez votre Compte Principal</p>}
      <Field label="Nom du sous-compte"><TextInput maxLength={80} placeholder="Compte Mariage" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Objectif financier"><TextInput inputMode="decimal" placeholder={parent?.currency ?? "USD"} value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
      <Field label="Code du sous-compte (4 chiffres)"><TextInput type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} /></Field>
      <Field label="Visuel"><VisualPicker value={visualKey} onChange={setVisualKey} /></Field>
      <Field label="Couleur"><div className="flex gap-2">{ACCENTS.map((c) => <button key={c} type="button" aria-label={c} onClick={() => setColor(c)} className={`press h-8 w-8 rounded-full ${color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`} style={{ backgroundColor: accentVar(c) }} />)}</div></Field>
      <Field label="Durée de blocage"><select value={lockDays} onChange={(e) => setLockDays(Number(e.target.value))} className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground">
        {LOCK_OPTIONS.map(([d, l]) => <option key={d} value={d}>{l}</option>)}
      </select></Field>
      {lockEnd && <p className="text-[0.72rem] text-muted-foreground">Échéance : {new Date(lockEnd).toLocaleDateString("fr-FR")} — aucun déblocage anticipé possible.</p>}
      {subCount >= 10 && <p className="text-sm text-destructive">Limite atteinte : 10 sous-comptes maximum</p>}
      <PrimaryButton disabled={!valid || busy} onClick={() => (lockEnd ? setStep(1) : void create())}>{busy ? "Création en cours…" : "Créer / Confirmer le compte"}</PrimaryButton>
    </div>
  </Modal>;
}

/* ---------------- Créer un groupe ---------------- */

export function NewGroupModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (g: { name: string; description: string; icon: string; target: number; currency: Currency }) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(GROUP_ICONS[0]!);
  const [target, setTarget] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setTarget("");
    }
  }, [open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Créer un groupe" subtitle="Mariage, voyage, église, business…">
      <div className="space-y-4">
        <Field label="Nom du groupe">
          <TextInput placeholder="Mariage Grace & Jonas" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description">
          <TextInput placeholder="Cotisation pour la cérémonie." value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Icône">
          <div className="flex flex-wrap gap-2">
            {GROUP_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`press h-9 w-9 rounded-xl border text-base ${icon === i ? "border-brand-blue bg-accent" : "border-border"}`}
              >
                {i}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Objectif">
          <TextInput inputMode="decimal" placeholder="1000" value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <PrimaryButton
          disabled={!name.trim() || Number(target) <= 0}
          onClick={async () => {
            try {
              await onConfirm({ name: name.trim(), description: description.trim(), icon, target: Number(target), currency: "USD" });
              onOpenChange(false);
              toast.success("Groupe créé", { description: name.trim() });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Création impossible");
            }
          }}
        >
          Créer le groupe
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/* ---------------- Cotiser ---------------- */

export function ContributeModal({
  open,
  onOpenChange,
  group,
  accounts,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  group: Group | null;
  accounts: Account[];
  onConfirm: (groupId: string, amount: number, accountId: string, accountPin?: string) => void | Promise<void>;
}) {
  const available = accounts.filter((a) => !isLocked(a));
  const [accountId, setAccountId] = useState(available[0]?.id ?? "");
  const [accountPin, setAccountPin] = useState("");
  useEffect(() => setAccountPin(""), [open, accountId]);
  const needsAccountPin = !!accounts.find((a) => a.id === accountId)?.hasDedicatedPin;
  const accountPinReady = !needsAccountPin || /^\d{4}$/.test(accountPin);
  const [amount, setAmount, value] = useAmount(open);
  useEffect(() => setAccountId(available[0]?.id ?? ""), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Cotiser — ${group?.name ?? ""}`} subtitle="Votre part rejoint la cagnotte du groupe">
      <div className="space-y-4">
        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} hideLocked />
        {needsAccountPin && <Field label="Code du sous-compte (4 chiffres)"><TextInput type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={accountPin} onChange={(e) => setAccountPin(e.target.value.replace(/\D/g, ""))} /></Field>}
        <Field label="Montant">
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <PrimaryButton
          color="brand-green"
          disabled={!accountPinReady || !group || value <= 0 || !accountId}
          onClick={async () => {
            try {
              await onConfirm(group?.id ?? "", value, accountId, accountPin);
              onOpenChange(false);
              toast.success("Cotisation enregistrée");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Cotisation impossible");
            }
          }}
        >
          Cotiser
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/* ---------------- Inviter ---------------- */

export function InviteModal({
  open,
  onOpenChange,
  filaxId,
  onAddMember,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filaxId: string;
  onAddMember?: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const link = typeof window !== "undefined" ? `${window.location.origin}/inscription?ref=${filaxId}` : "";

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Inviter" subtitle="Partagez FILAX et cotisez ensemble">
      <div className="space-y-4">
        <div className="rounded-xl bg-muted px-3 py-2.5 text-[0.72rem] text-muted-foreground break-all">{link}</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="press flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-[0.75rem] font-semibold text-foreground"
            onClick={() => {
              navigator.clipboard?.writeText(link);
              toast.success("Lien copié");
            }}
          >
            <Copy className="h-4 w-4" /> Copier
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Rejoins-moi sur FILAX : ${link}`)}`}
            target="_blank"
            rel="noreferrer"
            className="press flex items-center justify-center gap-2 rounded-xl py-2.5 text-[0.75rem] font-semibold text-white"
            style={{ backgroundColor: accentVar("brand-green") }}
          >
            <Share2 className="h-4 w-4" /> WhatsApp
          </a>
        </div>
        {onAddMember && (
          <>
            <Field label="Ajouter un membre au groupe">
              <TextInput placeholder="Username ou ID FILAX (ex. FLX-1A2B3C4D)" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <PrimaryButton
              disabled={!name.trim()}
              onClick={async () => {
                try {
                  await onAddMember(name.trim());
                  setName("");
                  onOpenChange(false);
                  toast.success("Membre ajouté");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Ajout impossible");
                }
              }}
            >
              Ajouter au groupe
            </PrimaryButton>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ---------------- Objectifs ---------------- */

export function NewGoalModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (g: { name: string; target: number; deadline: number; icon: string; currency: Currency }) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [icon, setIcon] = useState("🏍️");

  useEffect(() => {
    if (!open) {
      setName("");
      setTarget("");
      setDate("");
    }
  }, [open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Nouvel objectif" subtitle="L'argent reste bloqué jusqu'à l'échéance">
      <div className="space-y-4">
        <Field label="Nom de l'objectif">
          <TextInput placeholder="Acheter une moto" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Icône">
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`press h-9 w-9 rounded-xl border text-base ${icon === i ? "border-brand-blue bg-accent" : "border-border"}`}
              >
                {i}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Montant">
          <TextInput inputMode="decimal" placeholder="1500" value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Date d'échéance">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <PrimaryButton
          disabled={!name.trim() || Number(target) <= 0 || !date}
          onClick={async () => {
            try {
              await onConfirm({ name: name.trim(), target: Number(target), deadline: new Date(date).getTime(), icon, currency: "USD" });
            } catch (e) {
              toast.error("Objectif refusé", { description: (e as Error).message });
              return;
            }
            onOpenChange(false);
            toast.success("Objectif créé");
          }}
        >
          Créer l'objectif
        </PrimaryButton>
      </div>
    </Modal>
  );
}

export function FundGoalModal({
  open,
  onOpenChange,
  goal,
  accounts,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  goal: Goal | null;
  accounts: Account[];
  onConfirm: (goalId: string, amount: number, accountId: string, accountPin?: string) => void | Promise<void>;
}) {
  const available = accounts.filter((a) => !isLocked(a));
  const [accountId, setAccountId] = useState(available[0]?.id ?? "");
  const [accountPin, setAccountPin] = useState("");
  useEffect(() => setAccountPin(""), [open, accountId]);
  const needsAccountPin = !!accounts.find((a) => a.id === accountId)?.hasDedicatedPin;
  const accountPinReady = !needsAccountPin || /^\d{4}$/.test(accountPin);
  const [amount, setAmount, value] = useAmount(open);
  useEffect(() => setAccountId(available[0]?.id ?? ""), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Épargner — ${goal?.name ?? ""}`} subtitle="Dépôt vers votre épargne bloquée">
      <div className="space-y-4">
        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} hideLocked />
        {needsAccountPin && <Field label="Code du sous-compte (4 chiffres)"><TextInput type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={accountPin} onChange={(e) => setAccountPin(e.target.value.replace(/\D/g, ""))} /></Field>}
        <Field label="Montant">
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <PrimaryButton
          color="brand-green"
          disabled={!accountPinReady || !goal || value <= 0 || !accountId}
          onClick={async () => {
            try { await onConfirm(goal?.id ?? "", value, accountId, accountPin); } catch (e) { toast.error("Épargne refusée", { description: (e as Error).message }); return; }
            onOpenChange(false);
            toast.success("Épargne ajoutée");
          }}
        >
          Épargner
        </PrimaryButton>
      </div>
    </Modal>
  );
}
