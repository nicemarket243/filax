import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  UserRound,
  Mail,
  ShieldCheck,
  IdCard,
  ScanFace,
  Loader2,
  CheckCircle2,
  Camera,
  Upload,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { FilaxLogo } from "@/components/filax-logo";
import { BackButton } from "@/components/back-button";
import { AddPhotoMenu } from "@/components/add-photo-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Vérification et Inscription — FILAX" },
      {
        name: "description",
        content:
          "Créez votre compte FILAX : informations personnelles, vérification e-mail, pièce d'identité et vérification biométrique sécurisée.",
      },
    ],
  }),
  component: InscriptionPage,
});

type Step = "info" | "verify" | "document" | "biometric" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "info", label: "Informations" },
  { key: "verify", label: "E-mail" },
  { key: "document", label: "Identité" },
  { key: "biometric", label: "Biométrie" },
  { key: "done", label: "Validation" },
];

const DOC_TYPES = [
  { value: "passport", label: "Passeport" },
  { value: "id_card", label: "Carte d'identité" },
  { value: "driver_license", label: "Permis de conduire" },
] as const;

function InscriptionPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);

  // Identity / form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthCity, setBirthCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Verification code
  const [code, setCode] = useState("");

  // KYC document
  const [docType, setDocType] = useState<string>("passport");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);

  const handleDocFile = (file: File) => {
    setDocFile(file);
    setDocPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  // Resume an existing session (e.g. came back from the email link)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setEmail((prev) => prev || data.session!.user.email || "");
        setStep((prev) => (prev === "info" || prev === "verify" ? "document" : prev));
      }
    });
  }, []);

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !birthDate || !birthCity || !email || password.length < 6) {
      toast.error("Veuillez remplir tous les champs (mot de passe : 6 caractères min).");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/inscription`,
        data: {
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
          birth_city: birthCity,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Code de validation envoyé à votre adresse e-mail.");
    setStep("verify");
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Entrez le code à 6 chiffres reçu par e-mail.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
    if (error) {
      // Some confirmation e-mails use the generic email type
      const retry = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      if (retry.error) {
        setLoading(false);
        toast.error("Code invalide ou expiré. Vérifiez votre e-mail.");
        return;
      }
    }
    setLoading(false);
    toast.success("E-mail vérifié avec succès.");
    setStep("document");
  };

  const handleResend = async () => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) toast.error(error.message);
    else toast.success("Nouveau code envoyé.");
  };

  const handleDocumentUpload = async () => {
    if (!docFile) {
      toast.error("Importez une pièce d'identité valide.");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      toast.error("Session expirée, reconnectez-vous.");
      return;
    }
    setLoading(true);
    const ext = docFile.name.split(".").pop() || "jpg";
    const path = `${userId}/id-document.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("kyc-documents")
      .upload(path, docFile, { upsert: true });
    if (upErr) {
      setLoading(false);
      toast.error(upErr.message);
      return;
    }
    await supabase
      .from("profiles")
      .update({ id_document_type: docType, id_document_path: path })
      .eq("user_id", userId);
    setLoading(false);
    toast.success("Pièce d'identité enregistrée.");
    setStep("biometric");
  };

  const handleBiometricDone = async (blob: Blob) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      toast.error("Session expirée, reconnectez-vous.");
      return;
    }
    setLoading(true);
    const path = `${userId}/selfie.jpg`;
    const { error: upErr } = await supabase.storage
      .from("kyc-documents")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (upErr) {
      setLoading(false);
      toast.error(upErr.message);
      return;
    }
    await supabase
      .from("profiles")
      .update({ selfie_path: path, kyc_status: "pending" })
      .eq("user_id", userId);
    setLoading(false);
    toast.success("Vérification biométrique envoyée.");
    setStep("done");
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/inscription`,
    });
    if (result.error) toast.error("Connexion Google indisponible pour le moment.");
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-12 pt-6">
      <header className="flex items-center justify-between">
        <BackButton fallbackTo="/" />
        <FilaxLogo className="filax-logo-fade" height={22} />
      </header>

      {/* Progress */}
      <div className="mt-8">
        <div className="flex items-center justify-between text-[0.65rem] font-semibold text-muted-foreground">
          {STEPS.map((s, i) => (
            <span key={s.key} className={i <= stepIndex ? "text-brand-green" : ""}>
              {s.label}
            </span>
          ))}
        </div>
        <Progress value={progress} className="mt-2 h-1.5" />
      </div>

      <div className="mt-8 flex-1">
        {step === "info" && (
          <form onSubmit={handleSignUp} className="animate-fade-up space-y-4">
            <SectionTitle
              icon={<UserRound className="h-5 w-5 text-brand-green" />}
              title="Vérification & Inscription"
              subtitle="Renseignez vos informations pour créer votre compte FILAX sécurisé."
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mukendi" />
              </Field>
              <Field label="Prénom">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Peter" />
              </Field>
            </div>
            <Field label="Date de naissance">
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </Field>
            <Field label="Ville de naissance">
              <Input value={birthCity} onChange={(e) => setBirthCity(e.target.value)} placeholder="Kinshasa" />
            </Field>
            <Field label="Adresse e-mail">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
            </Field>
            <Field label="Mot de passe">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" disabled={loading} className="mt-2 w-full bg-brand-green text-background hover:bg-brand-green/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuer"}
            </Button>
            <div className="flex items-center gap-3 py-1 text-[0.7rem] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              className="w-full border-white/10 bg-white/[0.04]"
            >
              Continuer avec Google
            </Button>
          </form>
        )}

        {step === "verify" && (
          <div className="animate-fade-up space-y-5">
            <SectionTitle
              icon={<Mail className="h-5 w-5 text-brand-blue" />}
              title="Vérification e-mail"
              subtitle={`Saisissez le code à 6 chiffres envoyé à ${email}.`}
            />
            <div className="flex justify-center py-2">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerify} disabled={loading} className="w-full bg-brand-green text-background hover:bg-brand-green/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider le code"}
            </Button>
            <button onClick={handleResend} className="w-full text-center text-[0.72rem] text-brand-blue hover:underline">
              Renvoyer le code
            </button>
          </div>
        )}

        {step === "document" && (
          <div className="animate-fade-up space-y-5">
            <SectionTitle
              icon={<IdCard className="h-5 w-5 text-brand-blue" />}
              title="Vérification d'identité (KYC)"
              subtitle="Importez un document d'identité valide et lisible."
            />
            <div className="grid grid-cols-3 gap-2">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDocType(d.value)}
                  className={`rounded-xl border p-3 text-center text-[0.68rem] font-semibold transition-all ${
                    docType === d.value
                      ? "border-brand-green/50 bg-brand-green/10 text-foreground"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <AddPhotoMenu onFile={handleDocFile} allowPdf>
              <button
                type="button"
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.05] p-6 text-center transition-colors hover:border-brand-blue/40"
              >
                {docPreview ? (
                  <img src={docPreview} alt="Aperçu du document" className="max-h-40 w-auto rounded-xl object-contain" />
                ) : docFile ? (
                  <FileCheck2 className="h-8 w-8 text-brand-green" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                {docFile ? (
                  <>
                    <span className="text-xs text-foreground">{docFile.name}</span>
                    <span className="text-[0.65rem] text-muted-foreground">Toucher pour modifier la photo</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-foreground">Ajouter une photo</span>
                    <span className="text-[0.65rem] text-muted-foreground">Appareil photo · Galerie · Fichiers</span>
                  </>
                )}
              </button>
            </AddPhotoMenu>

            <Button onClick={handleDocumentUpload} disabled={loading} className="w-full bg-brand-blue text-foreground hover:bg-brand-blue/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuer"}
            </Button>
          </div>
        )}

        {step === "biometric" && (
          <div className="animate-fade-up space-y-5">
            <SectionTitle
              icon={<ScanFace className="h-5 w-5 text-brand-violet" />}
              title="Vérification biométrique"
              subtitle="Capturez votre visage. L'IA le compare à votre pièce d'identité."
            />
            <BiometricCapture loading={loading} onCapture={handleBiometricDone} />
          </div>
        )}

        {step === "done" && (
          <div className="animate-fade-up flex flex-col items-center justify-center gap-5 py-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-green/15 shadow-[0_0_40px_-8px_oklch(0.72_0.22_140/0.6)]">
              <CheckCircle2 className="h-10 w-10 text-brand-green" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Dossier envoyé</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Votre identité est en cours de vérification. Votre compte sera activé après validation
              complète de vos informations.
            </p>
            <div className="flex w-full items-center gap-2 rounded-xl border border-brand-gold/20 bg-brand-gold/[0.06] p-3 text-left">
              <ShieldCheck className="h-5 w-5 shrink-0 text-brand-gold" />
              <span className="text-[0.72rem] text-muted-foreground">
                Statut : <span className="font-semibold text-brand-gold">En attente de validation</span>
              </span>
            </div>
            <Button onClick={() => navigate({ to: "/" })} className="w-full bg-brand-green text-background hover:bg-brand-green/90">
              Retour à l'accueil
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        {icon}
      </div>
      <h1 className="text-lg font-bold text-foreground">{title}</h1>
      <p className="text-[0.78rem] leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[0.72rem] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function BiometricCapture({
  loading,
  onCapture,
}: {
  loading: boolean;
  onCapture: (blob: Blob) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch {
      setError("Caméra indisponible. Autorisez l'accès à la caméra.");
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          stop();
          onCapture(blob);
        }
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square w-56 overflow-hidden rounded-full border-2 border-brand-violet/40 bg-black/40 shadow-[0_0_40px_-8px_oklch(0.6_0.21_300/0.6)]">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {!streaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ScanFace className="h-10 w-10" />
            <span className="text-[0.7rem]">Scanner facial</span>
          </div>
        )}
        {streaming && (
          <div className="pointer-events-none absolute inset-0 animate-pulse-ring rounded-full border-2 border-brand-violet/30" />
        )}
      </div>

      {error && <p className="text-center text-[0.72rem] text-brand-red">{error}</p>}

      {!streaming ? (
        <Button onClick={start} className="w-full bg-brand-violet text-foreground hover:bg-brand-violet/90">
          <Camera className="mr-2 h-4 w-4" /> Activer le scanner facial
        </Button>
      ) : (
        <Button onClick={capture} disabled={loading} className="w-full bg-brand-green text-background hover:bg-brand-green/90">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Capturer & vérifier"}
        </Button>
      )}
    </div>
  );
}
