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
import { type Goal, GOAL_ICONS, ACCOUNT_COLORS } from "./store";

interface GoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (g: Omit<Goal, "id">) => void;
}

export function GoalModal({ open, onOpenChange, onConfirm }: GoalModalProps) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(GOAL_ICONS[0]);
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);

  const reset = () => {
    setName("");
    setTarget("");
    setDeadline("");
    setDescription("");
    setIcon(GOAL_ICONS[0]);
    setColor(ACCOUNT_COLORS[0]);
  };

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(reset, 200);
  };

  const submit = () => {
    const t = parseFloat(target.replace(",", ".")) || 0;
    if (!name.trim()) return toast.error("Donnez un nom à votre objectif.");
    if (t <= 0) return toast.error("Montant cible invalide.");
    onConfirm({
      name: name.trim(),
      target: t,
      saved: 0,
      deadline: deadline ? new Date(deadline).getTime() : Date.now() + 90 * 86_400_000,
      icon,
      color,
      description: description.trim() || undefined,
    });
    toast.success(`Objectif « ${name} » créé`);
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-white/10 bg-card/95 p-0 backdrop-blur-2xl">
        <div className="bg-gradient-to-b from-brand-blue/15 to-transparent px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Créer un objectif</DialogTitle>
          </DialogHeader>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-6 pb-6">
          <div className="space-y-1.5">
            <Label className="text-[0.72rem] text-muted-foreground">Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Moto, Maison, Mariage…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[0.72rem] text-muted-foreground">Montant cible</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="3500" inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.72rem] text-muted-foreground">Date cible</Label>
              <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[0.72rem] text-muted-foreground">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pourquoi cet objectif ?" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[0.72rem] text-muted-foreground">Icône</Label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition-all ${
                    icon === i ? "border-brand-green/60 bg-brand-green/15" : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[0.72rem] text-muted-foreground">Couleur</Label>
            <div className="flex gap-2">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-all bg-${c} ${color === c ? "border-white scale-110" : "border-transparent"}`}
                />
              ))}
            </div>
          </div>
          <Button onClick={submit} className="mt-2 w-full rounded-2xl bg-brand-blue py-6 font-bold text-white hover:bg-brand-blue/90">
            Créer l'objectif
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
