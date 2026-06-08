import { useState } from "react";
import {
  Smartphone,
  CreditCard,
  Bitcoin,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Download,
  Share2,
  ArrowLeft,
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
import { QRCode } from "./qr-code";
import { type Account, type TxMethod, formatMoney } from "./store";

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  defaultAccountId: string;
  onConfirm: (accountId: string, amount: number, method: TxMethod) => void;
}

type Method = "mobile" | "carte" | "crypto";
type Stage = "method" | "form" | "processing" | "pending" | "done";

const OPERATORS = [
  { id: "orange", label: "Orange Money", color: "bg-[#ff7900]" },
  { id: "airtel", label: "Airtel Money", color: "bg-[#e40000]" },
  { id: "mpesa", label: "M-Pesa", color: "bg-[#16a34a]" },
  { id: "africell", label: "Africell Money", color: "bg-[#7c3aed]" },
];

export function DepositModal({ open, onOpenChange, accounts, defaultAccountId, onConfirm }: DepositModalProps) {
  const [method, setMethod] = useState<Method>("mobile");
  const [stage, setStage] = useState<Stage>("method");
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  // mobile
  const [operator, setOperator] = useState("orange");
  const [phone, setPhone] = useState("");
  // card
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const numAmount = parseFloat(amount.replace(",", ".")) || 0;

  const reset = () => {
    setStage("method");
    setMethod("mobile");
    setAmount("");
    setPhone("");
    setHolder("");
    setNumber("");
    setExpiry("");
    setCvv("");
    setReference("");
  };

  const formatCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const finish = () => {
    onConfirm(accountId, numAmount, method);
    setReference("FLX-" + Math.random().toString(36).slice(2, 8).toUpperCase());
    setStage("done");
  };

  const submit = () => {
    if (numAmount <= 0) return toast.error("Entrez un montant valide.");
    if (method === "mobile") {
      if (phone.replace(/\D/g, "").length < 8) return toast.error("Numéro de téléphone invalide.");
      setStage("pending");
      const op = OPERATORS.find((o) => o.id === operator)!;
      toast(`Demande envoyée via ${op.label}`, { description: "Validez sur votre téléphone." });
      setTimeout(finish, 2400);
    } else if (method === "carte") {
      if (!holder.trim() || number.replace(/\s/g, "").length < 16 || expiry.length < 5 || cvv.length < 3)
        return toast.error("Complétez correctement la carte.");
      setStage("processing");
      setTimeout(finish, 1800);
    } else {
      setStage("processing");
      setTimeout(finish, 1600);
    }
  };

  const copyRef = () => {
    navigator.clipboard?.writeText(reference);
    toast.success("Référence copiée");
  };
  const download = () => toast.success("Reçu PDF téléchargé", { description: reference });
  const share = () => {
    if (navigator.share) navigator.share({ title: "Reçu FILAX", text: `Dépôt ${formatMoney(numAmount, account.currency)} — ${reference}` });
    else toast.success("Lien de partage copié");
  };

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(reset, 200);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-white/10 bg-card/95 p-0 backdrop-blur-2xl">
        <div className="bg-gradient-to-b from-brand-green/15 to-transparent px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {stage !== "method" && stage !== "done" && (
                <button onClick={() => setStage("method")} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              Dépôt sécurisé
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
          {stage === "method" && (
            <div className="space-y-3 animate-fade-up">
              <p className="text-[0.72rem] text-muted-foreground">Choisissez une méthode de paiement</p>
              {[
                { id: "mobile", label: "Mobile Money", desc: "Orange, Airtel, M-Pesa…", icon: Smartphone, c: "text-brand-green" },
                { id: "carte", label: "Carte bancaire", desc: "Visa, Mastercard", icon: CreditCard, c: "text-brand-blue" },
                { id: "crypto", label: "Crypto / QR", desc: "Scanner une adresse", icon: Bitcoin, c: "text-brand-gold" },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMethod(m.id as Method);
                      setStage("form");
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:bg-white/[0.07] active:scale-[0.98]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06]">
                      <Icon className={`h-5 w-5 ${m.c}`} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-foreground">{m.label}</span>
                      <span className="block text-[0.7rem] text-muted-foreground">{m.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {stage === "form" && (
            <div className="space-y-3 animate-fade-up">
              <div className="space-y-1.5">
                <Label className="text-[0.72rem] text-muted-foreground">Compte concerné</Label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground outline-none focus:border-brand-green/50"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} className="bg-card">
                      {a.icon} {a.name} · {a.currency}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[0.72rem] text-muted-foreground">Montant ({account.currency})</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
              </div>

              {method === "mobile" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[0.72rem] text-muted-foreground">Opérateur</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {OPERATORS.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => setOperator(o.id)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[0.72rem] font-semibold transition-all ${
                            operator === o.id ? "border-brand-green/50 bg-brand-green/10 text-foreground" : "border-white/10 bg-white/[0.03] text-muted-foreground"
                          }`}
                        >
                          <span className={`h-3 w-3 rounded-full ${o.color}`} /> {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[0.72rem] text-muted-foreground">Numéro de téléphone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 ..." inputMode="tel" />
                  </div>
                </>
              )}

              {method === "carte" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[0.72rem] text-muted-foreground">Nom du titulaire</Label>
                    <Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Peter Mukendi" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[0.72rem] text-muted-foreground">Numéro de carte</Label>
                    <Input value={number} onChange={(e) => setNumber(formatCard(e.target.value))} placeholder="0000 0000 0000 0000" inputMode="numeric" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[0.72rem] text-muted-foreground">Expiration</Label>
                      <Input value={expiry} onChange={(e) => setExpiry(formatExp(e.target.value))} placeholder="MM/AA" inputMode="numeric" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[0.72rem] text-muted-foreground">CVV</Label>
                      <Input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" type="password" inputMode="numeric" />
                    </div>
                  </div>
                </>
              )}

              {method === "crypto" && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                  <div className="rounded-2xl bg-white p-3 text-black">
                    <QRCode value={`filax:${accountId}:${numAmount}`} size={150} />
                  </div>
                  <p className="text-[0.72rem] text-muted-foreground">Scannez ce QR depuis votre portefeuille crypto. L'adresse est récupérée automatiquement.</p>
                  <code className="w-full truncate rounded-lg bg-white/[0.05] px-2 py-1 text-[0.62rem] text-brand-gold">bc1qfilax...{accountId.slice(-6)}</code>
                </div>
              )}

              <Button onClick={submit} className="mt-2 w-full rounded-2xl bg-brand-green py-6 text-base font-bold text-background hover:bg-brand-green/90">
                {method === "mobile" ? "Recevoir la demande" : method === "crypto" ? "J'ai scanné le QR" : "Payer maintenant"}
              </Button>
            </div>
          )}

          {(stage === "processing" || stage === "pending") && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-brand-green" />
              <p className="text-sm font-semibold text-foreground">{stage === "pending" ? "En attente de confirmation…" : "Traitement en cours…"}</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {stage === "pending" ? "Validez la demande sur votre téléphone." : "Sécurisation de la transaction."}
              </p>
            </div>
          )}

          {stage === "done" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center animate-fade-up">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/15 shadow-[0_0_40px_-8px_oklch(0.72_0.22_140/0.6)]">
                <CheckCircle2 className="h-8 w-8 text-brand-green" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Dépôt effectué</h3>
              <p className="text-2xl font-extrabold text-brand-green">+{formatMoney(numAmount, account.currency)}</p>
              <div className="w-full space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-[0.72rem]">
                <Row k="Compte" v={`${account.icon} ${account.name}`} />
                <Row k="Méthode" v={method === "mobile" ? "Mobile Money" : method === "carte" ? "Carte bancaire" : "Crypto"} />
                <Row k="Date" v={new Date().toLocaleString("fr-FR")} />
                <Row k="Référence" v={reference} mono />
              </div>
              <div className="grid w-full grid-cols-3 gap-2">
                <SmallBtn icon={Download} label="PDF" onClick={download} />
                <SmallBtn icon={Copy} label="Copier" onClick={copyRef} />
                <SmallBtn icon={Share2} label="Partager" onClick={share} />
              </div>
              <Button onClick={() => close(false)} className="w-full rounded-2xl bg-brand-green text-background hover:bg-brand-green/90">
                Terminer
              </Button>
            </div>
          )}

          {stage !== "done" && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[0.62rem] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-green" /> Transaction chiffrée et enregistrée
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

function SmallBtn({ icon: Icon, label, onClick }: { icon: typeof Copy; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-[0.62rem] font-semibold text-muted-foreground transition-all hover:bg-white/[0.07] active:scale-95"
    >
      <Icon className="h-4 w-4 text-foreground" />
      {label}
    </button>
  );
}
