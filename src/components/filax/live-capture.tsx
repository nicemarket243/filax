import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";

/**
 * Capture en direct par la caméra uniquement (aucun accès à la galerie),
 * pour les photos de vérification d'identité.
 */
export function LiveCapture({ label, hint, onChange }: { label: string; hint: string; onChange: (file: File | null) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);
  useEffect(() => () => stop(), [stop]);

  const start = async () => {
    setError(null);
    setPreview(null);
    onChange(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setStreaming(true);
      requestAnimationFrame(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      });
    } catch {
      setError("Caméra indisponible. Autorisez l'accès à la caméra.");
    }
  };

  const shoot = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 720;
    c.height = v.videoHeight || 720;
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      if (!blob) return;
      stop();
      setPreview(URL.createObjectURL(blob));
      onChange(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="space-y-2">
      <p className="text-[0.72rem] font-bold text-foreground">{label}</p>
      <p className="text-[0.62rem] text-muted-foreground">{hint}</p>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted/40">
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-cover" />
        ) : streaming ? (
          <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><Camera className="h-8 w-8" /></div>
        )}
      </div>
      {error && <p className="text-[0.65rem] text-brand-red">{error}</p>}
      <button
        type="button"
        onClick={streaming ? shoot : start}
        className="press flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-2.5 text-[0.75rem] font-bold text-foreground"
      >
        {preview ? <><RotateCcw className="h-4 w-4" /> Reprendre</> : streaming ? "Prendre la photo" : <><Camera className="h-4 w-4" /> Ouvrir la caméra</>}
      </button>
    </div>
  );
}
