import { useState } from "react";
import { CreditCard, Smartphone, Loader2, CheckCircle2, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  price: string;
}

const OPERATORS = [
  { id: "orange", label: "Orange Money", color: "bg-[#ff7900]" },
  { id: "airtel", label: "Airtel Money", color: "bg-[#e40000]" },
  { id: "mpesa", label: "M-Pesa", color: "bg-[#16a34a]" },
  { id: "other", label: "Autre opérateur", color: "bg-white/20" },
];

export function PaymentModal({ open, onOpenChange, planName, price }: PaymentModalProps) {
  const [method, setMethod] = useState<"card" | "mobile">("card");
  const [stage, setStage] = useState<"form" | "processing" | "pending" | "done">("form");

  // Card
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  // Mobile money
  const [operator, setOperator] = useState("orange");
  const [phone, setPhone] = useState("");

  const reset = () => {
    setStage("form");
    setHolder("");
    setNumber("");
    setExpiry("");
    setCvv("");
    setPhone("");
  };

  const formatNumber = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const payCard = () => {
    if (!holder.trim() || number.replace(/\s/g, "").length < 16 || expiry.length < 5 || cvv.length < 3) {
      toast.error("Veuillez compléter correctement les informations de carte.");
      return;
    }
    setStage("processing");
    setTimeout(() => {
      setStage("done");
      toast.success(`Paiement confirmé — ${planName}`);
    }, 1800);
  };

  const payMobile = () => {
    if (phone.replace(/\D/g, "").length < 8) {
      toast.error("Entrez un numéro de téléphone valide.");
      return;
    }
    setStage("pending");
    const op = OPERATORS.find((o) => o.id === operator)!;
    toast(`Demande envoyée via ${op.label}`, {
      description: "Confirmez la transaction sur votre téléphone.",
    });
    setTimeout(() => {
      setStage("done");
      toast.success(`Paiement ${op.label} confirmé`);
    }, 2600);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-white/10 bg-card/95 p-0 backdrop-blur-2xl">
        <div className="bg-gradient-to-b from-brand-violet/15 to-transparent px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-brand-green" /> Paiement sécurisé
            </DialogTitle>
            <DialogDescription>
              Forfait <span className="font-semibold text-foreground">{planName}</span> ·{" "}
              <span className="font-semibold text-brand-green">{price} USD / mois</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          {stage === "done" ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-green/15 shadow-[0_0_40px_-8px_oklch(0.72_0.22_140/0.6)]">
                <CheckCircle2 className="h-10 w-10 text-brand-green" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Abonnement activé</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Votre forfait {planName} est désormais actif. Bienvenue dans l'écosystème FILAX.
              </p>
              <Button onClick={() => onOpenChange(false)} className="w-full bg-brand-green text-background hover:bg-brand-green/90">
                Terminer
              </Button>
            </div>
          ) : stage === "pending" || stage === "processing" ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-brand-violet" />
              <p className="text-sm font-semibold text-foreground">
                {stage === "pending" ? "En attente de confirmation…" : "Traitement du paiement…"}
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {stage === "pending"
                  ? "Validez la demande reçue sur votre téléphone."
                  : "Sécurisation de la transaction en cours."}
              </p>
            </div>
          ) : (
            <>
              {/* Method switch */}
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                <button
                  onClick={() => setMethod("card")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                    method === "card" ? "bg-white/[0.1] text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <CreditCard className="h-4 w-4" /> Carte
                </button>
                <button
                  onClick={() => setMethod("mobile")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                    method === "mobile" ? "bg-white/[0.1] text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Smartphone className="h-4 w-4" /> Mobile Money
                </button>
              </div>

              {method === "card" ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[0.72rem] text-muted-foreground">Nom du titulaire</Label>
                    <Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Peter Mukendi" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[0.72rem] text-muted-foreground">Numéro de carte</Label>
                    <Input
                      value={number}
                      onChange={(e) => setNumber(formatNumber(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[0.72rem] text-muted-foreground">Expiration</Label>
                      <Input value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} placeholder="MM/AA" inputMode="numeric" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[0.72rem] text-muted-foreground">CVV</Label>
                      <Input
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123"
                        inputMode="numeric"
                        type="password"
                      />
                    </div>
                  </div>
                  <Button onClick={payCard} className="mt-2 w-full bg-brand-green text-background hover:bg-brand-green/90">
                    Payer maintenant · {price} USD
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
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
                          <span className={`h-3 w-3 rounded-full ${o.color}`} />
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[0.72rem] text-muted-foreground">Numéro de téléphone</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+243 ..."
                      inputMode="tel"
                    />
                  </div>
                  <Button onClick={payMobile} className="mt-2 w-full bg-brand-green text-background hover:bg-brand-green/90">
                    Recevoir la demande de paiement
                  </Button>
                </div>
              )}

              <p className="mt-4 flex items-center justify-center gap-1.5 text-[0.62rem] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-green" /> Transaction chiffrée · Annulable à tout moment
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
