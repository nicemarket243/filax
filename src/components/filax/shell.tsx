import { Link } from "@tanstack/react-router";
import { Bell, Home, PieChart, User, Users } from "lucide-react";
import { FilaxLogo } from "@/components/filax-logo";

export function AppHeader({ unread = 0, onNotifications }: { unread?: number; onNotifications?: () => void }) {
  return (
    <header className="flex items-center justify-between">
      <Link to="/profil" aria-label="Centre de gestion du compte FILAX" className="press">
        <FilaxLogo height={22} className="dark:brightness-100 brightness-0 dark:invert-0" />
      </Link>
      <button
        type="button"
        aria-label="Notifications"
        onClick={onNotifications}
        className="press relative flex h-9 w-9 items-center justify-center rounded-full bg-surface text-foreground soft-shadow"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[0.55rem] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
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
    <nav className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 items-center justify-around rounded-full border border-border bg-surface/80 p-1.5 backdrop-blur-xl soft-shadow">
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
