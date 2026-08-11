import { Link } from "@tanstack/react-router";
import { Bell, Home, PieChart, User, Users } from "lucide-react";
import { FilaxLogo } from "@/components/filax-logo";
import { ThemeToggle } from "@/components/filax/ui-kit";
import type { Profile } from "@/lib/filax-store";

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="flex items-center justify-between">
      <Link to="/" aria-label="Accueil FILAX" className="press">
        <FilaxLogo height={22} className="dark:brightness-100 brightness-0 dark:invert-0" />
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          aria-label="Notifications"
          className="press relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-red" />
        </button>
        <Link to="/profil" aria-label="Profil" className="press">
          <img
            src={profile.photo ?? ""}
            alt={`${profile.firstName} ${profile.lastName}`}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-blue/30"
          />
        </Link>
      </div>
    </header>
  );
}

const TABS = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/groupes", label: "Groupes", icon: Users },
  { to: "/analyse", label: "Analyse", icon: PieChart },
  { to: "/profil", label: "Profil", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 items-center justify-around rounded-full border border-border bg-surface/95 p-1.5 backdrop-blur-xl soft-shadow">
      {TABS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="press flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[0.6rem] font-semibold text-muted-foreground data-[status=active]:bg-accent data-[status=active]:text-brand-blue"
        >
          <Icon className="h-[1.15rem] w-[1.15rem]" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
