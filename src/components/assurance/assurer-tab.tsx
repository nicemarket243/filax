import { useRef, useState } from "react";
import { Smartphone, Tablet, Laptop, Video, Check, ArrowLeft, ScanLine, Square, CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { type DeviceType, DEVICE_LABEL } from "./store";

const DEVICE_ICON: Record<DeviceType, typeof Smartphone> = {
  telephone: Smartphone,
  tablette: Tablet,
  ordinateur: Laptop,
};

interface AssurerTabProps {
  onRegister: (type: DeviceType, name: string, imei: string) => void;
  onDone: () => void;
}

type Step = "select" | "imei" | "video" | "validate";

export function AssurerTab({ onRegister, onDone }: AssurerTabProps) {
  const [step, setStep] = useState<Step>("select");
  const [type, setType] = useState<DeviceType | null>(null);
  const [name, setName] = useState("");
  const [imei, setImei] = useState("");
  const [videoDone, setVideoDone] = useState(false);
  const [agree, setAgree] = useState(false);

  const reset = () => {
    setStep("select");
    setType(null);
    setName("");
    setImei("");
    setVideoDone(false);
    setAgree(false);
  };

  return (
    <div className="space-y-5">
      {/* Stepper */}
      {step !== "select" && (
        <div className="flex items-center justify-center gap-2">
          {(["imei", "video", "validate"] as Step[]).map((s, i) => {
            const order = ["imei", "video", "validate"];
            const cur = order.indexOf(step);
            const done = i < cur;
            const active = order[i] === step;
            return (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  active ? "w-8 bg-brand-green" : done ? "w-5 bg-brand-green/50" : "w-5 bg-white/15"
                }`}
              />
            );
          })}
        </div>
      )}

      {step === "select" && (
        <div className="space-y-3">
          <p className="text-center text-[0.78rem] text-muted-foreground">Quel appareil souhaitez-vous assurer ?</p>
          {(Object.keys(DEVICE_LABEL) as DeviceType[]).map((t) => {
            const Icon = DEVICE_ICON[t];
            return (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setStep("imei");
                }}
                className="flex w-full items-center gap-4 rounded-2xl bg-white px-5 py-4 text-left shadow-[0_8px_24px_-14px_rgba(0,0,0,0.6)] transition-all active:scale-[0.98]"
              >
                <Icon className="h-6 w-6 text-neutral-900" strokeWidth={1.5} />
                <span className="flex-1 text-[0.95rem] font-light tracking-tight text-neutral-900">{DEVICE_LABEL[t]}</span>
                <span className="text-neutral-400">›</span>
              </button>
            );
          })}
        </div>
      )}

      {step === "imei" && (
        <StepShell title="Numéro IMEI / Série" onBack={reset}>
          <input
            value={imei}
            onChange={(e) => setImei(e.target.value)}
            placeholder="Saisissez l'IMEI ou le numéro de série"
            className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-center text-[0.9rem] tracking-wider text-foreground outline-none focus:border-brand-green/50"
          />
          <p className="text-center text-[0.7rem] text-muted-foreground">Tapez <span className="font-semibold text-foreground">*#06#</span>, capturez, importez.</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Modèle (ex: ${type === "ordinateur" ? "MacBook Air" : type === "tablette" ? "iPad Air" : "iPhone 14 Pro"})`}
            className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[0.84rem] text-foreground outline-none focus:border-brand-green/50"
          />
          <button
            onClick={() => {
              if (imei.trim().length < 5) return toast.error("IMEI / série invalide.");
              if (!name.trim()) return toast.error("Indiquez le modèle.");
              toast.success("IMEI analysé · aucune correspondance volée");
              setStep("video");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green py-3.5 text-[0.82rem] font-bold text-background active:scale-[0.98]"
          >
            <ScanLine className="h-4 w-4" /> Analyser
          </button>
        </StepShell>
      )}

      {step === "video" && (
        <StepShell title="Preuve vidéo" onBack={() => setStep("imei")}>
          <VideoCapture done={videoDone} onCapture={() => setVideoDone(true)} />
          <button
            disabled={!videoDone}
            onClick={() => setStep("validate")}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[0.82rem] font-bold transition-all active:scale-[0.98] ${
              videoDone ? "bg-brand-green text-background" : "cursor-not-allowed bg-white/[0.06] text-muted-foreground"
            }`}
          >
            Continuer
          </button>
        </StepShell>
      )}

      {step === "validate" && (
        <StepShell title="Validation du contrat" onBack={() => setStep("video")}>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[0.76rem] text-muted-foreground">
            <p className="font-semibold text-foreground">{name}</p>
            <p className="mt-1">IMEI : {imei}</p>
            <p>Type : {type ? DEVICE_LABEL[type] : ""}</p>
            <p className="mt-2 text-[0.7rem]">Période de carence de 14 jours avant activation complète de la couverture.</p>
          </div>
          <button
            onClick={() => setAgree((a) => !a)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left"
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${agree ? "border-brand-green bg-brand-green" : "border-white/30"}`}>
              {agree && <Check className="h-3.5 w-3.5 text-background" strokeWidth={3} />}
            </span>
            <span className="text-[0.74rem] text-foreground">J'accepte les conditions du contrat FILAX Assurance.</span>
          </button>
          <button
            onClick={() => {
              if (!agree) return toast.error("Veuillez accepter les conditions.");
              if (type) onRegister(type, name.trim(), imei.trim());
              toast.success("Contrat confirmé · appareil en période de carence");
              reset();
              onDone();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green py-3.5 text-[0.82rem] font-bold text-background active:scale-[0.98]"
          >
            <CircleCheck className="h-4 w-4" /> Confirmer le contrat
          </button>
        </StepShell>
      )}
    </div>
  );
}

function StepShell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-3 animate-fade-up">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h3 className="text-[0.86rem] font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function VideoCapture({ done, onCapture }: { done: boolean; onCapture: () => void }) {
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(15);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setRecording(true);
    setCount(15);
    timer.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          if (timer.current) clearInterval(timer.current);
          setRecording(false);
          onCapture();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  return (
    <div className="rounded-2xl bg-white p-4">
      {/* Viseur avec overlay cadre fin */}
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-neutral-900">
        <div className="pointer-events-none absolute inset-5 rounded-lg border border-dashed border-white/50" />
        {recording ? (
          <div className="flex flex-col items-center gap-2 text-white">
            <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-brand-red">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-red" /> REC
            </span>
            <span className="text-3xl font-extrabold tabular-nums">{count}s</span>
            <span className="text-[0.64rem] text-white/60">Filmez tous les angles de l'appareil</span>
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-1 text-brand-green">
            <CircleCheck className="h-8 w-8" />
            <span className="text-[0.7rem] font-semibold">Vidéo enregistrée (15s)</span>
          </div>
        ) : (
          <Square className="h-8 w-8 text-white/40" strokeWidth={1} />
        )}
      </div>
      <button
        onClick={start}
        disabled={recording}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-[0.8rem] font-semibold text-white disabled:opacity-50"
      >
        <Video className="h-4 w-4" /> {done ? "Refilmer" : "Démarrer la vidéo"}
      </button>
    </div>
  );
}
