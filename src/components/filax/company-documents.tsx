import { useEffect, useState } from "react";
import { Copy, Download, Eye, FileText, Mail, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { COMPANY_DOCUMENTS, loadDocumentFile } from "@/lib/company-documents";
import { useI18n } from "@/lib/i18n";

export function CompanyDocuments() {
  const { t } = useI18n();
  return (
    <section className="mt-5 space-y-3 border-t border-border pt-4" aria-label={t("Documents (Files)")}>
      <h3 className="text-sm font-semibold">{t("Documents (Files)")}</h3>
      <TooltipProvider delayDuration={200}>
        {COMPANY_DOCUMENTS.map((document) => <DocumentRow key={document.path} document={document} />)}
      </TooltipProvider>
    </section>
  );
}

function DocumentRow({ document }: { document: (typeof COMPANY_DOCUMENTS)[number] }) {
  const { t } = useI18n();
  const [file, setFile] = useState<File>();
  const [error, setError] = useState(false);
  const [status, setStatus] = useState("");
  const [menu, setMenu] = useState(false);
  const [url, setUrl] = useState(document.path as string);
  useEffect(() => {
    let active = true;
    setUrl(new URL(document.path, window.location.origin).href);
    void loadDocumentFile(document.path, document.filename).then((result) => {
      if (active) setFile(result);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [document]);

  const share = () => {
    if (!file) return;
    if (!navigator.canShare?.({ files: [file] })) { setMenu(true); return; }
    // The file is already loaded: keep native sharing inside this user gesture.
    void navigator.share({ files: [file], title: t(document.title) }).then(() => {
      setStatus("Fichier envoyé vers l’application choisie.");
    }).catch((reason: unknown) => {
      if (reason instanceof Error && reason.name === "AbortError") return;
      setMenu(true);
    });
  };
  const copyLink = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setStatus("Lien du fichier copié : collez-le où vous voulez.");
      setMenu(false);
    }).catch(() => setStatus("Copie impossible sur cet appareil."));
  };
  const copy = () => {
    if (file && typeof ClipboardItem !== "undefined" && ClipboardItem.supports?.("application/pdf")) {
      void navigator.clipboard.write([new ClipboardItem({ "application/pdf": file })]).then(() => {
        setStatus("Fichier PDF copié : collez-le où vous voulez.");
      }).catch(() => setStatus("Copie impossible sur cet appareil."));
    } else copyLink();
  };
  const text = `${t(document.title)} : ${url}`;
  return (
    <article className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">{t(document.title)}</h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t(document.description)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DocumentAction label={t("Voir le PDF")}>
          <Button asChild variant="outline" size="icon"><a href={document.path} target="_blank" rel="noopener noreferrer" aria-label={t("Voir le PDF")}><Eye className="h-4 w-4" /></a></Button>
        </DocumentAction>
        <DocumentAction label={t("Télécharger le PDF")}>
          <Button asChild size="icon" className="magnetide-tap"><a href={document.path} download={document.filename} aria-label={t("Télécharger le PDF")} onClick={(event) => {
            if (!window.confirm(t("Autoriser le téléchargement du Mémorandum FILAX (PDF) sur cet appareil ?"))) { event.preventDefault(); return; }
            setStatus("Téléchargement lancé. Retrouvez le fichier dans vos Téléchargements.");
          }}><Download className="h-4 w-4" /></a></Button>
        </DocumentAction>
        <DocumentAction label={t("Copier le fichier ou son lien")}>
          <Button variant="outline" size="icon" onClick={copy} aria-label={t("Copier le fichier ou son lien")}><Copy className="h-4 w-4" /></Button>
        </DocumentAction>
        <Popover open={menu} onOpenChange={setMenu}>
          <PopoverTrigger asChild><Button variant="outline" disabled={!file} onClick={(event) => { event.preventDefault(); share(); }}><Share2 className="h-4 w-4" />{t("Partager")}</Button></PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3">
            <p className="text-xs text-muted-foreground">{t("Partage de fichier indisponible ici. Ces options partagent le lien du PDF.")}</p>
            <Button asChild variant="secondary" className="w-full"><a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a></Button>
            <Button asChild variant="secondary" className="w-full"><a href={`mailto:?subject=${encodeURIComponent(t(document.title))}&body=${encodeURIComponent(text)}`}><Mail className="h-4 w-4" />{t("E-mail")}</a></Button>
            <Button variant="outline" className="w-full" onClick={copyLink}><Copy className="h-4 w-4" />{t("Copier le lien")}</Button>
          </PopoverContent>
        </Popover>
      </div>
      {!file && <p role="status" className="text-xs text-muted-foreground">{t(error ? "Le partage du PDF est indisponible. Vous pouvez réessayer en rouvrant Documents." : "Préparation du PDF…")}</p>}
      {status && <p role="status" className="text-xs text-muted-foreground">{t(status)}</p>}
    </article>
  );
}

function DocumentAction({ label, children }: { label: string; children: React.ReactNode }) {
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}