import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { GOAL_ICONS, type Group } from "./store";

interface GroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (g: Omit<Group, "id">) => void;
}

export function GroupModal({ open, onOpenChange, onConfirm }: GroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [icon, setIcon] = useState("👨‍👩‍👧");

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o)
      setTimeout(() => {
        setName("");
        setDescription("");
        setTarget("");
        setIcon("👨‍👩‍👧");
      }, 200);
  };

  const submit = () => {
    const t = parseFloat(target.replace(",", ".")) || 0;
    if (!name.trim()) return toast.error("Nommez votre groupe.");
    onConfirm({
      name: name.trim(),
      description: description.trim() || undefined,
      target: t,
      icon,
      members: [{ id: crypto.randomUUID(), name: "Vous", paid: true, amount: 0, goal: t > 0 ? Math.round(t / 5) : 1000, verified: true, avatar: memberAvatar("Vous-Filax") }],
    });
    toast.success(`Groupe « ${name} » créé`);
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-white/10 bg-card/95 p-0 backdrop-blur-2xl">
        <div className="bg-gradient-to-b from-brand-gold/15 to-transparent px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Créer un groupe d'épargne</DialogTitle>
          </DialogHeader>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-6 pb-6">
          <div className="space-y-1.5">
            <Label className="text-[0.72rem] text-muted-foreground">Nom du groupe</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tontine Famille" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[0.72rem] text-muted-foreground">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objet du groupe" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[0.72rem] text-muted-foreground">Objectif du groupe (USD)</Label>
            <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="5000" inputMode="decimal" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[0.72rem] text-muted-foreground">Icône</Label>
            <div className="flex flex-wrap gap-2">
              {["👨‍👩‍👧", "🤝", "💰", "🏆", ...GOAL_ICONS].map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition-all ${
                    icon === i ? "border-brand-gold/60 bg-brand-gold/15" : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[0.66rem] text-muted-foreground">Maximum 100 membres. Vous pourrez les inviter par QR, ID, téléphone ou lien après création.</p>
          <Button onClick={submit} className="mt-2 w-full rounded-2xl bg-brand-gold py-6 font-bold text-background hover:bg-brand-gold/90">
            Créer le groupe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
