import { useRef, useState } from "react";
import { AlertTriangle, UploadCloud, FileCheck2, X } from "lucide-react";
import { toast } from "sonner";
import { type AssuranceData, type ClaimKind, DEVICE_LABEL } from "./store";

interface SinistreTabProps {
  data: AssuranceData;
  onDeclare: (deviceId: string, kind: ClaimKind) => void;
}

export function SinistreTab({ data, onDeclare }: SinistreTabProps) {
  const [open, setOpen] = useState(false);
  const [deviceId, setDeviceId] = useState(data.devices[0]?.id ?? "");
  const [kind, setKind] = useState<ClaimKind>("vol");
  const [proof1, setProof1] = useState(false);
  const [proof2, setProof2] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const eligible = data.devices.filter((d) => d.status !== "sinistre");

  const submit = () => {
    if (!deviceId) return toast.error("Sélectionnez un appareil.");
    if (!proof1 || !proof2) return toast.error("Ajoutez les deux preuves requises.");
    onDeclare(deviceId, kind);
    setSubmitted(true);
  };

  const reset = () => {
    setOpen(false);
    setSubmitted(false);
    setProof1(false);
    setProof2(false);
  };

  if (!open) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-brand-red/20 bg-gradient-to-br from-brand-red/15 via-card to-black p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-red/20">
            <AlertTriangle className="h-6 w-6 text-brand-red" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-foreground">Signaler un problème</h2>
          <p className="mt-1 text-[0.78rem] text-muted-foreground">
            Déclarez une perte ou un vol. Notre équipe traite votre dossier sous 24h.
          </p>
        </div>

        {data.claims.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold text-foreground">Dossiers en cours</h3>
            <div className="space-y-2">
              {data.claims.map((c) => {
                const dev = data.devices.find((d) => d.id === c.deviceId);
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                    <FileCheck2 className="h-5 w-5 text-brand-green" />
                    <div className="flex-1">
                      <p className="text-[0.8rem] font-semibold text-foreground">
                        {c.kind === "vol" ? "Vol" : "Perte"} · {dev?.name ?? "Appareil"}
                      </p>
                      <p className="text-[0.64rem] text-muted-foreground">Réf. {c.reference} · traitement sous 24h</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <button
          onClick={() => setOpen(true)}
          disabled={eligible.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-red py-4 text-[0.86rem] font-bold text-white shadow-[0_10px_30px_-12px_oklch(0.64_0.22_22/0.7)] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <AlertTriangle className="h-4.5 w-4.5" /> Déclarer une perte / vol
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-foreground">
          <X className="h-4 w-4" />
        </button>
        <h3 className="text-[0.9rem] font-bold text-foreground">Déclaration de sinistre</h3>
      </div>

      {/* Appareil */}
      <div className="space-y-1.5">
        <p className="text-[0.72rem] text-muted-foreground">Appareil concerné</p>
        <div className="space-y-2">
          {eligible.map((d) => (
            <button
              key={d.id}
              onClick={() => setDeviceId(d.id)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                deviceId === d.id ? "border-brand-red/50 bg-brand-red/[0.08]" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <span className="text-[0.82rem] font-semibold text-foreground">{d.name}</span>
              <span className="text-[0.64rem] text-muted-foreground">{DEVICE_LABEL[d.type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div className="grid grid-cols-2 gap-2">
        {(["vol", "perte"] as ClaimKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-2xl border py-3 text-[0.8rem] font-semibold capitalize transition-all ${
              kind === k ? "border-brand-red/50 bg-brand-red/[0.08] text-foreground" : "border-white/10 bg-white/[0.03] text-muted-foreground"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <DropZone label="Preuve « Mode Perdu »" hint="Capture Find My Device" done={proof1} onDone={() => setProof1(true)} />
      <DropZone label="Certificat de perte" hint="PDF ou photo" done={proof2} onDone={() => setProof2(true)} />

      <button
        onClick={submit}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-red py-3.5 text-[0.84rem] font-bold text-white active:scale-[0.98]"
      >
        Envoyer le dossier
      </button>

      {/* Pop-up confirmation effet verre */}
      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-md">
          <div className="w-full max-w-xs rounded-3xl border border-white/15 bg-card/80 p-6 text-center shadow-2xl backdrop-blur-2xl animate-fade-up">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/20">
              <FileCheck2 className="h-7 w-7 text-brand-green" />
            </span>
            <h4 className="mt-4 text-base font-bold text-foreground">Dossier transmis</h4>
            <p className="mt-1 text-[0.76rem] text-muted-foreground">Délai de traitement : 24h. Vous recevrez une notification dès la mise à jour de votre statut.</p>
            <button onClick={reset} className="mt-5 w-full rounded-2xl bg-brand-green py-3 text-[0.8rem] font-bold text-background">
              Terminé
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DropZone({ label, hint, done, onDone }: { label: string; hint: string; done: boolean; onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const startUpload = () => {
    if (uploading || done) return;
    setUploading(true);
    setProgress(0);
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(iv);
          setUploading(false);
          onDone();
          return 100;
        }
        return p + 10;
      });
    }, 120);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[0.72rem] text-muted-foreground">{label}</p>
      <button
        onClick={() => (input.current ? input.current.click() : startUpload())}
        className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed py-6 transition-all ${
          done ? "border-brand-green/50 bg-brand-green/[0.06]" : "border-white/20 bg-white/[0.02] hover:bg-white/[0.04]"
        }`}
      >
        {done ? (
          <>
            <FileCheck2 className="h-6 w-6 text-brand-green" />
            <span className="text-[0.74rem] font-semibold text-brand-green">Fichier ajouté</span>
          </>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
            <span className="text-[0.74rem] font-semibold text-foreground">Déposer ou parcourir</span>
            <span className="text-[0.62rem] text-muted-foreground">{hint}</span>
          </>
        )}
      </button>
      <input ref={input} type="file" accept="image/*,application/pdf" className="hidden" onChange={startUpload} />
      {(uploading || done) && (
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${done ? 100 : progress}%` }} />
        </div>
      )}
    </div>
  );
}
