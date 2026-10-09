import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { BookOpen, Building2, Download, Share2, Headphones, Landmark, LifeBuoy, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilaxLogo } from "@/components/filax-logo";
import { Coffre } from "@/components/filax/coffre";
import { SupportChat } from "@/components/filax/support-chat";
import { FILAX_INFORMATION } from "@/lib/filax-information";
import { useI18n } from "@/lib/i18n";
import bank from "@/assets/account-themes/bank-modern.jpg";
import family from "@/assets/account-themes/family.jpg";
import project from "@/assets/account-themes/house.jpg";

const ICONS = [Building2, Landmark, BookOpen, Send, LifeBuoy];
const GUIDE = [
  {
    src: bank,
    title: "01 · Votre compte",
    text: "Inscription → Code de vérification → Compte principal",
  },
  {
    src: family,
    title: "02 · Votre identité",
    text: "Pièce lisible → Selfie net → Examen du dossier",
  },
  {
    src: project,
    title: "03 · Votre projet",
    text: "Compte principal → Objectif et code → Sous-compte",
  },
];

export function FilaxInformation({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [chat, setChat] = useState(false);
  const pathname = useLocation({ select: (location) => location.pathname });
  useEffect(() => {
    setChat(false);
    onOpenChange(false);
  }, [pathname, onOpenChange]);
  useEffect(() => {
    if (!open) setChat(false);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(90dvh,820px)] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-lg border-border bg-surface/95 p-0 backdrop-blur-2xl"
        aria-describedby="filax-info-description"
      >
        <header className="shrink-0 border-b border-border px-5 py-5 pr-12 sm:px-7">
          <DialogTitle>
            <FilaxLogo height={30} />
          </DialogTitle>
          <DialogDescription id="filax-info-description" className="mt-3 text-xs">
            {t("Notre mission, vos comptes et votre accompagnement.")}
          </DialogDescription>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-5 pb-24 sm:px-6">
          {FILAX_INFORMATION.map((section, index) => {
            const Icon = ICONS[index];
            return (
              <Coffre
                key={section.title}
                title={t(section.title)}
                subtitle={t(section.subtitle)}
                icon={Icon ? <Icon className="h-4 w-4" /> : undefined}
              >
                {index === 2 && (
                  <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    {GUIDE.map((item) => (
                      <figure
                        key={item.title}
                        className="overflow-hidden rounded-lg border border-border"
                      >
                        <img
                          src={item.src}
                          alt={t(item.title)}
                          className="aspect-[16/9] w-full object-cover"
                        />
                        <figcaption className="p-3">
                          <p className="text-xs font-bold">{t(item.title)}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {t(item.text)}
                          </p>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                <div className="space-y-5 border-t border-border pt-4">
                  {section.blocks.map(([heading, body]) => (
                    <div key={heading}>
                      <h3 className="text-sm font-semibold text-foreground">{t(heading)}</h3>
                      <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{t(body)}</p>
                    </div>
                  ))}
                </div>
                {index === 4 && <MemorandumActions />}
                {index === 4 && (
                  <address className="mt-5 space-y-3 border-t border-border pt-4 text-sm not-italic">
                    <a
                      href="https://wa.me/243814900710"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-brand-green underline underline-offset-4"
                    >
                      WhatsApp · +243 81 4900 710
                    </a>
                    <a
                      href="https://www.filax-app.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all text-brand-blue underline underline-offset-4"
                    >
                      www.filax-app.com
                    </a>
                    <a
                      href="mailto:filax-app@gmail.com"
                      className="block text-brand-blue underline underline-offset-4"
                    >
                      filax-app@gmail.com
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "Réseaux sociaux : Filax App sur Instagram, Facebook et Twitter. Les liens officiels exacts restent à confirmer.",
                      )}
                    </p>
                  </address>
                )}
              </Coffre>
            );
          })}
        </div>
        {chat ? (
          <SupportChat onClose={() => setChat(false)} />
        ) : (
          <Button
            className="magnetide-tap absolute bottom-5 right-5 h-12 gap-2 rounded-full px-5 soft-shadow"
            aria-label={t("Ouvrir l’assistant FILAX")}
            title={t("Ouvrir l’assistant FILAX")}
            onClick={() => setChat(true)}
          >
            <Headphones className="h-5 w-5" />
            {t("Assistant FILAX")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

const MEMO_PATH = "/filax-memorandum-2026.pdf";
const MEMO_NAME = "FILAX-Memorandum-Officiel-2026.pdf";

function MemorandumActions() {
  const { t } = useI18n();
  const [menu, setMenu] = useState(false);
  const url = typeof window === "undefined" ? MEMO_PATH : `${window.location.origin}${MEMO_PATH}`;
  const text = `${t("FILAX — Mémorandum officiel 2026")} : ${url}`;
  const share = async () => {
    try {
      const blob = await (await fetch(MEMO_PATH)).blob();
      const file = new File([blob], MEMO_NAME, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t("FILAX — Mémorandum officiel 2026") });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    setMenu((v) => !v);
  };
  const links = [
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(text)}`],
    [t("E-mail"), `mailto:?subject=${encodeURIComponent(t("FILAX — Mémorandum officiel 2026"))}&body=${encodeURIComponent(text)}`],
    ["Telegram", `https://t.me/share/url?url=${encodeURIComponent(url)}`],
    ["SMS", `sms:?&body=${encodeURIComponent(text)}`],
  ];
  return (
    <div className="mt-5 space-y-3 border-t border-border pt-4">
      <Button asChild className="magnetide-tap h-auto w-full whitespace-normal py-3">
        <a href={MEMO_PATH} download={MEMO_NAME}>
          <Download className="h-4 w-4 shrink-0" />
          {t("Télécharger le Mémorandum Officiel de l’Entreprise (PDF)")}
        </a>
      </Button>
      <Button variant="outline" className="w-full" onClick={() => void share()}>
        <Share2 className="h-4 w-4" />
        {t("Partager le mémorandum")}
      </Button>
      {menu && (
        <div className="grid grid-cols-2 gap-2">
          {links.map(([label, href]) => (
            <Button key={label} asChild variant="secondary" size="sm">
              <a href={href} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            className="col-span-2"
            onClick={() => void navigator.clipboard?.writeText(url)}
          >
            {t("Copier le lien")}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t("15 pages · Identité, modèle économique, technique, transactions, support et cadre juridique.")}
      </p>
    </div>
  );
}
