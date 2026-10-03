import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setLang, useI18n } from "@/lib/i18n";

const DONE_KEY = "filax-onboarded";

/**
 * Inscription légère affichée UNIQUEMENT à un tout nouvel utilisateur
 * (aucune donnée locale, aucune session). Les anciens utilisateurs ne la voient jamais.
 */
export function FirstVisitOnboarding() {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("RD Congo");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DONE_KEY)) return;
    const existing = Object.keys(localStorage).some((k) => k.startsWith("filax-v"));
    if (existing) {
      localStorage.setItem(DONE_KEY, "1");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) localStorage.setItem(DONE_KEY, "1");
      else setOpen(true);
    });
  }, []);

  if (!open) return null;

  const finish = () => {
    const [firstName, ...rest] = name.trim().split(/\s+/);
    try {
      const raw = localStorage.getItem("filax-v4");
      const data = raw ? JSON.parse(raw) : null;
      if (data?.profile) {
        data.profile = { ...data.profile, firstName, lastName: rest.join(" "), phone: `+243 ${phone}`, country };
        localStorage.setItem("filax-v4", JSON.stringify(data));
      } else {
        localStorage.setItem("filax-new-profile", JSON.stringify({ firstName, lastName: rest.join(" "), phone: `+243 ${phone}`, country }));
      }
    } catch {
      /* ignore */
    }
    localStorage.setItem("filax-theme", dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(DONE_KEY, "1");
    setOpen(false);
  };

  const input =
    "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand-blue";
  const pill = (active: boolean) =>
    `press flex-1 rounded-xl border py-2.5 text-[0.8rem] font-bold ${active ? "border-brand-blue bg-brand-blue/10 text-foreground" : "border-border text-muted-foreground"}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/40 backdrop-blur-xl sm:items-center">
      <div className="w-full max-w-md rounded-t-[2rem] border border-border bg-surface/95 p-6 pb-8 shadow-2xl sm:rounded-[2rem]">
        <h2 className="text-metal text-center text-xl font-extrabold">{t("Bienvenue sur FILAX")}</h2>
        <p className="mt-1 text-center text-[0.72rem] text-muted-foreground">{t("Quelques secondes suffisent pour commencer.")}</p>
        <div className="mt-5 space-y-3">
          <input className={input} placeholder={t("Votre nom complet")} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2">
            <span className="flex items-center rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground">+243</span>
            <input className={input} inputMode="tel" placeholder={t("Numéro de téléphone")} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))} />
          </div>
          <select className={input} value={country} onChange={(e) => setCountry(e.target.value)}>
            {["RD Congo", "Congo-Brazzaville", "Angola", "Rwanda", "Burundi", "Ouganda", "France", "Belgique"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <p className="pt-1 text-[0.7rem] font-semibold text-muted-foreground">{t("Choisir la langue")}</p>
          <div className="flex gap-2">
            <button type="button" className={pill(lang === "fr")} onClick={() => setLang("fr")}>Français</button>
            <button type="button" className={pill(lang === "en")} onClick={() => setLang("en")}>English</button>
          </div>
          <p className="pt-1 text-[0.7rem] font-semibold text-muted-foreground">{t("Mode d'apparence")}</p>
          <div className="flex gap-2">
            <button type="button" className={pill(dark)} onClick={() => setDark(true)}>{t("Sombre")}</button>
            <button type="button" className={pill(!dark)} onClick={() => setDark(false)}>{t("Clair")}</button>
          </div>
          <button
            type="button"
            disabled={name.trim().length < 2 || phone.replace(/\D/g, "").length < 9}
            onClick={finish}
            className="press mt-2 w-full rounded-xl bg-brand-blue px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {t("Commencer")}
          </button>
        </div>
      </div>
    </div>
  );
}
