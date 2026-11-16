import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Facebook,
  Ghost,
  Instagram,
  MessageCircle,
  MessageCircleMore,
  MessagesSquare,
  QrCode,
  Share2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/filax/ui-kit";
import { FilaxQR } from "@/components/filax/qr";
import mark from "@/assets/filax-mark.png.asset.json";
import { useI18n } from "@/lib/i18n";
import {
  buildAppInvitationLink,
  PUBLIC_SITE_ORIGIN,
  buildDirectShareUrl,
  COPY_OPEN_DESTINATIONS,
  type CopyOpenShareChannel,
  type DirectShareChannel,
} from "@/lib/app-share";

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Continue with the local browser fallback below.
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    field.remove();
  }
  return copied;
}

export function ShareAppButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"main" | "qr" | "apps">("main");

  useEffect(() => {
    setLink(buildAppInvitationLink(PUBLIC_SITE_ORIGIN));
  }, []);

  const message = t("Rejoignez-moi sur FILAX, votre banque numérique dans la poche.");

  const copyLink = async () => {
    if (!link) return false;
    const success = await copyText(link);
    setCopied(success);
    if (success) toast.success(t("Lien d'invitation copié"));
    else toast.error(t("Copie impossible. Sélectionnez le lien affiché."));
    return success;
  };

  const openDirect = (channel: DirectShareChannel) => {
    if (!link) return;
    const target = buildDirectShareUrl(channel, link, message);
    if (channel === "sms") window.location.href = target;
    else window.open(target, "_blank", "noopener,noreferrer");
  };

  const openCopyFirst = async (channel: CopyOpenShareChannel) => {
    if (!link) return;
    const copying = copyText(link);
    window.open(COPY_OPEN_DESTINATIONS[channel], "_blank", "noopener,noreferrer");
    const success = await copying;
    setCopied(success);
    if (success) toast.success(t("Lien copié. Collez-le dans votre message."));
    else toast.error(t("Copie impossible. Utilisez le bouton Copier le lien avant d'écrire votre message."));
  };

  const nativeShare = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "FILAX", text: message, url: link });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    setView("apps");
  };

  const channels: (
    | { id: DirectShareChannel; label: string; icon: typeof MessageCircle; direct: true }
    | { id: CopyOpenShareChannel; label: string; icon: typeof MessageCircle; direct: false }
  )[] = [
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, direct: true },
    { id: "facebook", label: "Facebook", icon: Facebook, direct: true },
    { id: "messenger", label: "Messenger", icon: MessageCircleMore, direct: false },
    { id: "instagram", label: "Instagram", icon: Instagram, direct: false },
    { id: "x", label: "X", icon: X, direct: true },
    { id: "snapchat", label: "Snapchat", icon: Ghost, direct: false },
    { id: "sms", label: t("SMS / Messages"), icon: MessagesSquare, direct: true },
  ];

  const closeAll = () => { setCopied(false); setView("main"); };

  return (
    <>
      <button
        type="button"
        onClick={() => { closeAll(); setOpen(true); }}
        className="press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-[0.78rem] font-bold text-brand-blue soft-shadow"
      >
        <Share2 className="h-4 w-4" /> {t("Partager l'application")}
      </button>

      <Modal
        open={open}
        onOpenChange={(next) => { setOpen(next); if (!next) closeAll(); }}
        title={t("Partager l'application")}
        subtitle={t("Votre lien ouvre directement l'inscription simplifiée FILAX.")}
        centered
        contentClassName="p-4 pb-5"
      >
        {view === "qr" ? (
          <div className="flex flex-col items-center">
            <div className="relative">
              {link ? <FilaxQR value={link} size={168} level="H" /> : <div className="h-[192px] w-[192px] rounded-2xl bg-muted" />}
              <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white p-1">
                <img src={mark.url} alt="FILAX" className="h-full w-full object-contain" />
              </span>
            </div>
            <button type="button" onClick={() => setView("main")} className="press mt-3 text-[0.72rem] font-bold text-brand-blue">
              {t("Retour")}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!link}
                onClick={() => setView("qr")}
                className="press flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-2.5 text-[0.75rem] font-bold text-foreground disabled:opacity-40"
              >
                <QrCode className="h-4 w-4 text-brand-blue" /> {t("Scanner le QR")}
              </button>
              <button
                type="button"
                disabled={!link}
                onClick={() => void copyLink()}
                className="press flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-2.5 text-[0.75rem] font-bold text-foreground disabled:opacity-40"
              >
                {copied ? <Check className="h-4 w-4 text-brand-green" /> : <Copy className="h-4 w-4 text-brand-blue" />}
                {t(copied ? "Lien copié" : "Copier le lien")}
              </button>
            </div>
            <button
              type="button"
              disabled={!link}
              onClick={() => void nativeShare()}
              className="magnetide-tap mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-2.5 text-[0.78rem] font-bold text-primary-foreground disabled:opacity-40"
            >
              <Share2 className="h-4 w-4" /> {t("Partager")}
            </button>
            {view === "apps" && (
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {channels.map(({ id, label, icon: Icon, direct }) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={`${t("Partager sur")} ${label}`}
                    onClick={() => direct ? openDirect(id as DirectShareChannel) : void openCopyFirst(id as CopyOpenShareChannel)}
                    className="magnetide-tap flex flex-col items-center gap-1 rounded-xl border border-border bg-surface py-2 text-[0.6rem] font-bold text-foreground"
                  >
                    <Icon className="h-4 w-4 text-brand-blue" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
