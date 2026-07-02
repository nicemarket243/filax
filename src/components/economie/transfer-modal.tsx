import { useState, useMemo } from "react";
import {
  ArrowLeftRight,
  QrCode,
  Camera,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  BadgeCheck,
  Smartphone,
  CreditCard,
  Landmark,
  Lock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Account, type TxMethod, formatMoney, memberAvatar } from "./store";

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  defaultAccountId: string;
  onConfirm: (accountId: string, amount: number, method: TxMethod) => void;
}

type Zone = "afrique" | "europe" | "amerique";

interface Recipient {
  id: string;
  nom: string; // nom de famille
  postnom: string;
  prenom: string;
  zone: Zone;
  seed: string;
  country: string; // pays du destinataire
  flag: string; // drapeau emoji
  currency: string; // devise autorisée pour ce pays
}

/** Annuaire Filax de démonstration pour la validation en temps réel. */
const DIRECTORY: Recipient[] = [
  { id: "FLX-GRACE01", nom: "Mukendi", postnom: "Kabeya", prenom: "Grace", zone: "afrique", seed: "Grace", country: "RD Congo", flag: "🇨🇩", currency: "USD" },
  { id: "FLX-JONAS02", nom: "Ilunga", postnom: "Tshibang", prenom: "Jonas", zone: "afrique", seed: "Jonas", country: "RD Congo", flag: "🇨🇩", currency: "USD" },
  { id: "FLX-JEAN03", nom: "Dupont", postnom: "Bernard", prenom: "Jean", zone: "europe", seed: "Jean", country: "France", flag: "🇫🇷", currency: "EUR" },
  { id: "FLX-SARA04", nom: "Johnson", postnom: "Lee", prenom: "Sarah", zone: "amerique", seed: "Sarah", country: "Canada", flag: "🇨🇦", currency: "CAD" },
];

const ZONE_BRIDGE: Record<Zone, { label: string; method: TxMethod; icon: typeof Smartphone; detail: string }> = {
  afrique: { label: "Afrique", method: "mobile", icon: Smartphone, detail: "Retrait via Mobile Money local (Orange, Airtel, M-Pesa)." },
  europe: { label: "Europe", method: "carte", icon: Landmark, detail: "Virement SEPA vers le compte bancaire lié." },
  amerique: { label: "Amérique", method: "carte", icon: CreditCard, detail: "Virement ACH / carte bancaire liée." },
};

type Stage = "form" | "scan" | "processing" | "done";

export function TransferModal({ open, onOpenChange, accounts, defaultAccountId, onConfirm }: TransferModalProps) {
  const [stage, setStage] = useState<Stage>("form");
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [query, setQuery] = useState("");
  const [validated, setValidated] = useState(false);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [reference, setReference] = useState("");

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const numAmount = parseFloat(amount.replace(",", ".")) || 0;

  // Correspondance de l'ID saisi (candidat), matérialisée seulement après validation.
  const candidate = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (q.length < 4) return null;
    return DIRECTORY.find((r) => r.id.toUpperCase() === q || r.id.toUpperCase().startsWith(q)) ?? null;
  }, [query]);

  // Le bénéficiaire n'est reconnu qu'après validation par « Entrée » ou scan.
  const recipient = validated ? candidate : null;
  const bridge = recipient ? ZONE_BRIDGE[recipient.zone] : null;

  const reset = () => {
    setStage("form");
    setQuery("");
    setValidated(false);
    setAmount("");
    setPin("");
    setReference("");
  };

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(reset, 220);
  };

  // Valide l'ID : détecte le pays et auto-configure la devise autorisée.
  const validate = (r: Recipient | null) => {
    if (!r) return toast.error("Bénéficiaire introuvable. Vérifiez l'ID Filax.");
    setValidated(true);
    // Sélection automatique d'un compte source dans la devise autorisée si disponible.
    const match = accounts.find((a) => a.currency === r.currency);
    if (match) setAccountId(match.id);
    toast.success(`${r.prenom} ${r.nom} validé`, { description: `${r.flag} ${r.country} · devise ${r.currency}` });
  };

  const submit = () => {
    if (!recipient) return toast.error("Validez d'abord le bénéficiaire (touche Entrée).");
    if (numAmount <= 0) return toast.error("Entrez un montant valide.");
    if (numAmount > (account?.balance ?? 0)) return toast.error("Solde insuffisant sur ce compte.");
    if (pin.length < 4) return toast.error("Entrez votre code PIN (4 à 5 chiffres).");
    setStage("processing");
    setTimeout(() => {
      onConfirm(accountId, numAmount, bridge!.method);
      setReference("FLX-" + Math.random().toString(36).slice(2, 8).toUpperCase());
      setStage("done");
    }, 2000);
  };

  const scanFound = () => {
    const r = DIRECTORY[0];
    setQuery(r.id);
    setValidated(true);
    const match = accounts.find((a) => a.currency === r.currency);
    if (match) setAccountId(match.id);
    setStage("form");
    toast.success("QR scanné", { description: `${r.prenom} ${r.nom} · ${r.flag} ${r.country}` });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-0 bg-card/70 p-0 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="bg-gradient-to-b from-brand-violet/15 to-transparent px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-brand-violet" /> Transfert Filax
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-6 pb-6">
          {stage === "form" && (
            <div className="space-y-4 animate-fade-up">
              {/* POINT A — Identification du bénéficiaire */}
              <div className="space-y-1.5">
                <Label className="text-[0.72rem] text-muted-foreground">Bénéficiaire</Label>

                {/* Drapeau (gauche) + nom du pays (droite) apparaissent après validation */}
                {recipient && (
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.05] px-3 py-2 backdrop-blur-xl animate-fade-up">
                    <span className="text-2xl leading-none">{recipient.flag}</span>
                    <span className="text-sm font-bold text-foreground">{recipient.country}</span>
                  </div>
                )}

                <div className="relative">
                  <Input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setValidated(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        validate(candidate);
                      }
                    }}
                    placeholder="Entrer l'ID Filax puis Entrée, ou Scanner QR"
                    className="pr-11"
                  />
                  <button
                    onClick={() => setStage("scan")}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-white/[0.06] text-brand-violet transition-colors hover:bg-white/[0.12]"
                    title="Scanner un QR code"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                </div>

                {query.trim().length >= 4 && !validated && (
                  <p className="px-1 text-[0.7rem] text-muted-foreground">
                    {candidate ? "Appuyez sur Entrée pour valider ce bénéficiaire." : "Aucun bénéficiaire trouvé pour cet ID."}
                  </p>
                )}

                {recipient && (
                  <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3 backdrop-blur-xl animate-fade-up">
                    <img
                      src={memberAvatar(recipient.seed)}
                      alt={recipient.prenom}
                      className="h-11 w-11 rounded-full object-cover ring-2 ring-brand-green/40"
                    />
                    <div className="flex-1">
                      <p className="flex items-center gap-1 text-sm font-bold text-foreground">
                        {recipient.nom} {recipient.postnom} {recipient.prenom}
                        <BadgeCheck className="h-3.5 w-3.5 text-brand-green" />
                      </p>
                      <p className="text-[0.68rem] text-muted-foreground">{recipient.id}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* POINT B — Transaction */}
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[0.72rem] text-muted-foreground">Montant</Label>
                  <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[0.72rem] text-muted-foreground">Devise</Label>
                  {/* Devise auto-configurée : seule la devise autorisée du pays est proposée */}
                  <div className="flex h-11 items-center gap-1.5 rounded-xl bg-white/[0.05] px-3 text-sm font-bold text-foreground backdrop-blur-xl">
                    <Lock className="h-3.5 w-3.5 text-brand-violet" />
                    {recipient ? recipient.currency : "—"}
                  </div>
                </div>
              </div>
              <p className="-mt-1 px-1 text-[0.66rem] text-muted-foreground">
                Depuis {account?.icon} {account?.name} · {formatMoney(account?.balance ?? 0, account?.currency ?? "USD")}
              </p>

              <div className="space-y-1.5">
                <Label className="text-[0.72rem] text-muted-foreground">Code PIN secret</Label>
                <Input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="••••"
                  type="password"
                  inputMode="numeric"
                  className="tracking-[0.5em]"
                />
              </div>

              {/* POINT C — Bridge universel automatique */}
              {bridge && (
                <div className="flex items-start gap-3 rounded-2xl bg-brand-violet/[0.08] p-3 backdrop-blur-xl animate-fade-up">
                  <bridge.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-violet" />
                  <div>
                    <p className="text-[0.74rem] font-semibold text-foreground">
                      Zone {bridge.label} détectée
                    </p>
                    <p className="text-[0.66rem] text-muted-foreground">{bridge.detail}</p>
                  </div>
                </div>
              )}

              <Button
                onClick={submit}
                className="mt-1 w-full rounded-2xl bg-brand-green py-6 text-base font-bold text-background hover:bg-brand-green/90"
              >
                Confirmer le transfert
              </Button>
            </div>
          )}

          {stage === "scan" && (
            <div className="flex flex-col items-center gap-4 py-4 animate-fade-up">
              <div className="relative flex aspect-square w-full max-w-[240px] items-center justify-center overflow-hidden rounded-3xl bg-black/60 backdrop-blur-xl">
                <div className="absolute inset-6 rounded-2xl border-2 border-brand-violet/60" />
                <div className="absolute inset-x-6 top-6 h-0.5 animate-pulse bg-brand-violet" />
                <Camera className="h-10 w-10 text-white/40" />
                <button
                  onClick={() => setStage("form")}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-center text-[0.72rem] text-muted-foreground">
                Placez le QR code du bénéficiaire dans le cadre.
              </p>
              <Button onClick={scanFound} className="w-full rounded-2xl bg-brand-violet py-5 font-bold text-white hover:bg-brand-violet/90">
                Simuler la détection du QR
              </Button>
            </div>
          )}

          {stage === "processing" && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-brand-green" />
              <p className="text-sm font-semibold text-foreground">Transfert en cours…</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Acheminement via {bridge?.label} · {bridge && ZONE_BRIDGE[recipient!.zone].detail}
              </p>
            </div>
          )}

          {stage === "done" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center animate-fade-up">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/15 shadow-[0_0_40px_-8px_oklch(0.72_0.22_140/0.6)]">
                <CheckCircle2 className="h-8 w-8 text-brand-green" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Transfert envoyé</h3>
              <p className="text-2xl font-extrabold text-brand-green">−{formatMoney(numAmount, account?.currency ?? "USD")}</p>
              <div className="w-full space-y-1.5 rounded-2xl bg-white/[0.04] p-4 text-left text-[0.72rem] backdrop-blur-xl">
                <Row k="Bénéficiaire" v={`${recipient?.prenom} ${recipient?.nom}`} />
                <Row k="Pays" v={`${recipient?.flag ?? ""} ${recipient?.country ?? ""}`} />
                <Row k="Devise" v={recipient?.currency ?? ""} />
                <Row k="Méthode" v={bridge?.method === "mobile" ? "Mobile Money" : "Carte / Virement"} />
                <Row k="Date" v={new Date().toLocaleString("fr-FR")} />
                <Row k="Référence" v={reference} mono />
              </div>
              <Button onClick={() => close(false)} className="w-full rounded-2xl bg-brand-green text-background hover:bg-brand-green/90">
                Terminer
              </Button>
            </div>
          )}

          {stage !== "done" && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[0.62rem] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-green" /> Transfert chiffré et sécurisé par PIN
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-semibold text-foreground ${mono ? "font-mono text-brand-gold" : ""}`}>{v}</span>
    </div>
  );
}
