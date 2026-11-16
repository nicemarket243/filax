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
  Share2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Modal, PrimaryButton } from "@/components/filax/ui-kit";
import { FilaxQR } from "@/components/filax/qr";
import { useI18n } from "@/lib/i18n";
import {
  buildAppInvitationLink,
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

export function ShareAppButton({ filaxId }: { filaxId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLink(buildAppInvitationLink(window.location.origin, filaxId));
  }, [filaxId]);

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
    await copyLink();
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

  return (
    <>
      <button
        type="button"
        onClick={() => { setCopied(false); setOpen(true); }}
        className="magnetide-tap mt-3 flex w-full items-center gap-3 rounded-2xl border border-brand-blue/20 bg-surface p-4 text-left soft-shadow"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
          <Share2 className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.82rem] font-bold text-foreground">{t("Partager l'application")}</span>
          <span className="mt-0.5 block text-[0.66rem] text-muted-foreground">{t("Invitez vos proches à rejoindre FILAX.")}</span>
        </span>
      </button>

      <Modal
        open={open}
        onOpenChange={(next) => { setOpen(next); if (!next) setCopied(false); }}
        title={t("Partager l'application")}
        subtitle={t("Votre lien ouvre directement l'inscription simplifiée FILAX.")}
        contentClassName="max-h-[76vh] p-4 pb-5"
      >
        <div className="flex flex-col items-center">
          {link ? <FilaxQR value={link} size={132} /> : <div className="h-[156px] w-[156px] rounded-2xl bg-muted" />}
          <p className="mt-1.5 text-center text-[0.62rem] text-muted-foreground">{t("Votre proche scanne ce code pour ouvrir FILAX.")}</p>
        </div>

        <button
          type="button"
          disabled={!link}
          onClick={() => void copyLink()}
          aria-label={t("Copier le lien d'invitation")}
          className="magnetide-tap mt-3 w-full rounded-2xl border border-brand-blue/20 bg-brand-blue/[0.06] p-2.5 text-left disabled:opacity-40"
        >
          <span className="flex items-start gap-2">
            <span className="min-w-0 flex-1">
              <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-brand-blue">{t("Votre lien d'invitation")}</span>
              <span className="mt-1 block break-all text-[0.7rem] leading-relaxed text-foreground" data-testid="invitation-link">{link}</span>
            </span>
            {copied ? <Check className="mt-1 h-4 w-4 shrink-0 text-brand-green" /> : <Copy className="mt-1 h-4 w-4 shrink-0 text-brand-blue" />}
          </span>
        </button>

        <div className="mt-3 grid grid-cols-7 gap-1">
          {channels.map(({ id, label, icon: Icon, direct }) => (
            <button
              key={id}
              type="button"
              disabled={!link}
              aria-label={`${t("Partager sur")} ${label}`}
              onClick={() => direct ? openDirect(id as DirectShareChannel) : void openCopyFirst(id as CopyOpenShareChannel)}
              title={label}
              className="magnetide-tap flex items-center justify-center rounded-xl border border-border bg-surface py-2 disabled:opacity-40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <Icon className="h-[1.1rem] w-[1.1rem]" />
              </span>
            </button>
          ))}
        </div>

        <p className="mt-2 text-center text-[0.6rem] leading-relaxed text-muted-foreground">
          {t("Pour Messenger, Instagram et Snapchat, le lien est copié avant l'ouverture : collez-le dans votre message.")}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!link}
          onClick={() => void copyLink()}
          className="magnetide-tap flex w-full items-center justify-center gap-2 rounded-xl border border-brand-blue/30 bg-brand-blue/10 px-4 py-2.5 text-sm font-bold text-brand-blue disabled:opacity-40"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {t(copied ? "Lien copié" : "Copier le lien")}
        </button>
        <PrimaryButton disabled={!link} onClick={() => void nativeShare()}>
          <span className="inline-flex items-center gap-2"><Share2 className="h-4 w-4" />{t("Partager")}</span>
        </PrimaryButton>
        </div>
      </Modal>
    </>
  );
}
