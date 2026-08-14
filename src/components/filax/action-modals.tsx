import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, QrCode, Search, Share2 } from "lucide-react";

import {
  ACCENTS,
  ACCOUNT_ICONS,
  GROUP_ICONS,
  MOBILE_MONEY,
  formatMoney,
  isLocked,
  type AccentKey,
  type Account,
  type Currency,
  type Goal,
  type Group,
  type TxMethod,
} from "@/lib/filax-store";
import { Field, Modal, PrimaryButton, TextInput, accentVar } from "@/components/filax/ui-kit";

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
            {a.icon} {a.name} — {formatMoney(a.balance, a.currency)}
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
  onConfirm: (accountId: string, amount: number, method: TxMethod) => void;
}) {
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [method, setMethod] = useState<TxMethod>("mpesa");
  const [amount, setAmount, value] = useAmount(open);
  const [scan, setScan] = useState(false);
  const [scanned, setScanned] = useState<string | null>(null);
  useEffect(() => {
    setAccountId(defaultAccountId);
    if (!open) setScanned(null);
  }, [defaultAccountId, open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Déposer de l'argent" subtitle="Mobile Money, banque partenaire ou QR code">
      <div className="space-y-4">
        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />
        <MethodPicker value={method} onChange={setMethod} />
        <button
          type="button"
          onClick={() => setScan(true)}
          className="press flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-[0.72rem] font-semibold text-brand-blue"
        >
          <QrCode className="h-4 w-4" /> Scanner un QR code
        </button>
        {scanned && <p className="text-[0.68rem] text-muted-foreground">Source scannée : {scanned}</p>}
        <Field label="Montant">
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <PrimaryButton
          color="brand-green"
          disabled={value <= 0}
          onClick={() => {
            onConfirm(accountId, value, method);
            onOpenChange(false);
            toast.success("Dépôt effectué", { description: `${value} crédité sur votre compte.` });
          }}
        >
          Confirmer le dépôt
        </PrimaryButton>
      </div>
      <QrScanModal
        open={scan}
        onOpenChange={setScan}
        onResult={(v) => {
          setScanned(v);
          toast.success("QR code lu", { description: v });
        }}
      />
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
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: Account[];
  defaultAccountId: string;
  onConfirm: (accountId: string, amount: number, method: TxMethod) => void;
}) {
  const available = accounts.filter((a) => !isLocked(a));
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [method, setMethod] = useState<TxMethod>("orange");
  const [amount, setAmount, value] = useAmount(open);
  useEffect(() => {
    const ok = available.some((a) => a.id === defaultAccountId);
    setAccountId(ok ? defaultAccountId : (available[0]?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAccountId, open]);

  const account = accounts.find((a) => a.id === accountId);
  const tooMuch = !!account && value > account.balance;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Retirer de l'argent" subtitle="Banque partenaire → Mobile Money">
      <div className="space-y-4">
        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} hideLocked />
        <MethodPicker value={method} onChange={setMethod} />
        <Field label="Montant">
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        {tooMuch && <p className="text-[0.7rem] font-semibold text-brand-red">Solde insuffisant.</p>}
        <PrimaryButton
          color="brand-red"
          disabled={value <= 0 || tooMuch || !accountId}
          onClick={() => {
            onConfirm(accountId, value, method);
            onOpenChange(false);
            toast.success("Retrait envoyé", { description: "Vous recevrez l'argent sur votre Mobile Money." });
          }}
        >
          Confirmer le retrait
        </PrimaryButton>
      </div>
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
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: Account[];
  defaultAccountId: string;
  onConfirm: (accountId: string, amount: number, recipient: string) => void;
}) {
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState<(typeof DIRECTORY)[number] | null>(null);
  const [amount, setAmount, value] = useAmount(open);

  useEffect(() => {
    setAccountId(defaultAccountId);
    if (!open) {
      setQuery("");
      setRecipient(null);
    }
  }, [defaultAccountId, open]);

  const results = query
    ? DIRECTORY.filter((d) => [d.name, d.id, d.phone].some((f) => f.toLowerCase().includes(query.toLowerCase())))
    : [];

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Envoyer de l'argent" subtitle="Nom, ID FILAX, téléphone ou QR code">
      <div className="space-y-4">
        <Field label="Destinataire">
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
        </Field>

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
          results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRecipient(r)}
              className="press flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left"
            >
              <span className="text-[0.78rem] font-semibold text-foreground">{r.name}</span>
              <span className="text-[0.65rem] text-muted-foreground">{r.id}</span>
            </button>
          ))
        )}

        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} hideLocked />
        <Field label="Montant">
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>

        <PrimaryButton
          disabled={!recipient || value <= 0}
          onClick={() => {
            onConfirm(accountId, value, recipient!.name);
            onOpenChange(false);
            toast.success("Transfert instantané envoyé", { description: `${value} envoyés à ${recipient!.name}.` });
          }}
        >
          Envoyer maintenant
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/* ---------------- Créer un compte ---------------- */

export function NewAccountModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (a: { name: string; currency: Currency; icon: string; color: AccentKey; target?: number | null; lockedUntil?: number | null }) => void;
}) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [icon, setIcon] = useState(ACCOUNT_ICONS[0]!);
  const [color, setColor] = useState<AccentKey>("brand-blue");
  const [target, setTarget] = useState("");
  const [lockDate, setLockDate] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setTarget("");
      setLockDate("");
    }
  }, [open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Créer un compte" subtitle="Épargne libre ou bloquée jusqu'à une date">
      <div className="space-y-4">
        <Field label="Nom du compte">
          <TextInput placeholder="Compte Vacances" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Devise">
          <div className="grid grid-cols-2 gap-2">
            {(["USD", "CDF"] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`press rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                  currency === c ? "border-transparent bg-brand-blue text-white" : "border-border text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
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
        <Field label="Couleur">
          <div className="flex gap-2">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={`press h-8 w-8 rounded-full ${color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                style={{ backgroundColor: accentVar(c) }}
              />
            ))}
          </div>
        </Field>
        <Field label="Objectif (optionnel)">
          <TextInput inputMode="decimal" placeholder="1500" value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Bloquer jusqu'au (optionnel)">
          <TextInput type="date" value={lockDate} onChange={(e) => setLockDate(e.target.value)} />
        </Field>
        <PrimaryButton
          disabled={!name.trim()}
          onClick={() => {
            onConfirm({
              name: name.trim(),
              currency,
              icon,
              color,
              target: Number(target) || null,
              lockedUntil: lockDate ? new Date(lockDate).getTime() : null,
            });
            onOpenChange(false);
            toast.success("Compte créé", { description: name.trim() });
          }}
        >
          Créer le compte
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/* ---------------- Créer un groupe ---------------- */

export function NewGroupModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (g: { name: string; description: string; icon: string; target: number; currency: Currency }) => void;
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
          onClick={() => {
            onConfirm({ name: name.trim(), description: description.trim(), icon, target: Number(target), currency: "USD" });
            onOpenChange(false);
            toast.success("Groupe créé", { description: name.trim() });
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
  onConfirm: (groupId: string, amount: number, accountId: string) => void;
}) {
  const available = accounts.filter((a) => !isLocked(a));
  const [accountId, setAccountId] = useState(available[0]?.id ?? "");
  const [amount, setAmount, value] = useAmount(open);
  useEffect(() => setAccountId(available[0]?.id ?? ""), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Cotiser — ${group?.name ?? ""}`} subtitle="Votre part rejoint la cagnotte du groupe">
      <div className="space-y-4">
        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} hideLocked />
        <Field label="Montant">
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <PrimaryButton
          color="brand-green"
          disabled={!group || value <= 0 || !accountId}
          onClick={() => {
            onConfirm(group!.id, value, accountId);
            onOpenChange(false);
            toast.success("Cotisation enregistrée");
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
  onAddMember?: (name: string) => void;
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
              <TextInput placeholder="Nom du membre" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <PrimaryButton
              disabled={!name.trim()}
              onClick={() => {
                onAddMember(name.trim());
                setName("");
                onOpenChange(false);
                toast.success("Membre ajouté");
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
  onConfirm: (g: { name: string; target: number; deadline: number; icon: string; currency: Currency }) => void;
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
          onClick={() => {
            onConfirm({ name: name.trim(), target: Number(target), deadline: new Date(date).getTime(), icon, currency: "USD" });
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
  onConfirm: (goalId: string, amount: number, accountId: string) => void;
}) {
  const available = accounts.filter((a) => !isLocked(a));
  const [accountId, setAccountId] = useState(available[0]?.id ?? "");
  const [amount, setAmount, value] = useAmount(open);
  useEffect(() => setAccountId(available[0]?.id ?? ""), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Épargner — ${goal?.name ?? ""}`} subtitle="Dépôt vers votre épargne bloquée">
      <div className="space-y-4">
        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} hideLocked />
        <Field label="Montant">
          <TextInput inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <PrimaryButton
          color="brand-green"
          disabled={!goal || value <= 0 || !accountId}
          onClick={() => {
            onConfirm(goal!.id, value, accountId);
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
