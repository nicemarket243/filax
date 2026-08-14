import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Modal, PrimaryButton, TextInput, Field } from "@/components/filax/ui-kit";
import { FilaxQR } from "@/components/filax/qr";

/** Scanner de QR code FILAX — caméra si disponible, sinon saisie manuelle de l'ID. */
export function QrScanModal({
  open,
  onOpenChange,
  onResult,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onResult: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const tick = () => {
      const video = videoRef.current;
      if (video && ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height);
        if (code?.data) {
          onResult(code.data.trim());
          onOpenChange(false);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => setError("Caméra indisponible. Saisissez l'ID FILAX manuellement."));

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setError(null);
    };
  }, [open, onOpenChange, onResult]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Scanner un QR code" subtitle="Placez le QR FILAX dans le cadre">
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-muted" style={{ aspectRatio: "1 / 1" }}>
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/70" />
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <Camera className="h-6 w-6 text-muted-foreground" />
              <p className="text-[0.72rem] text-muted-foreground">{error}</p>
            </div>
          )}
        </div>

        <Field label="Ou saisissez l'ID FILAX">
          <TextInput placeholder="FLX-1029-GM" value={manual} onChange={(e) => setManual(e.target.value)} />
        </Field>
        <PrimaryButton
          disabled={!manual.trim()}
          onClick={() => {
            onResult(manual.trim());
            setManual("");
            onOpenChange(false);
          }}
        >
          Valider l'ID
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/** QR code de réception — permet à quelqu'un d'autre de vous envoyer de l'argent. */
export function ReceiveQrModal({
  open,
  onOpenChange,
  filaxId,
  name,
  title = "Recevoir via QR code",
  subtitle = "Faites scanner ce code pour recevoir de l'argent",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filaxId: string;
  name?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} subtitle={subtitle}>
      <div className="flex flex-col items-center gap-3">
        <FilaxQR value={filaxId} size={168} />
        {name && <p className="text-[0.85rem] font-bold text-foreground">{name}</p>}
        <p className="text-[1rem] font-extrabold tracking-tight text-brand-blue">{filaxId}</p>
        <div className="grid w-full grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(filaxId);
              toast.success("ID FILAX copié");
            }}
            className="press flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-[0.75rem] font-semibold text-foreground"
          >
            <Copy className="h-4 w-4" /> Copier
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Mon ID FILAX : ${filaxId}`)}`}
            target="_blank"
            rel="noreferrer"
            className="press flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-[0.75rem] font-semibold text-foreground"
          >
            <Share2 className="h-4 w-4" /> Partager
          </a>
        </div>
      </div>
    </Modal>
  );
}
