import { useRouter } from "@tanstack/react-router";

interface BackButtonProps {
  className?: string;
  /** Optional explicit fallback route when there is no history to go back to. */
  fallbackTo?: string;
  label?: string;
}

/**
 * Premium, slightly-curved back arrow used across every FILAX sub-page.
 * Glassmorphism pill, smooth press animation, instant response.
 */
export function BackButton({ className, fallbackTo = "/", label }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: fallbackTo });
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Retour"
      className={`group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-foreground/90 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.1] active:scale-95 ${className ?? ""}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="transition-transform duration-300 group-hover:-translate-x-0.5"
        aria-hidden="true"
      >
        {/* Slightly curved shaft + arrow head */}
        <path
          d="M14.5 5C9.8 6.4 6.4 8.8 5 12c1.4 3.2 4.8 5.6 9.5 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 8.5 5 12l4 3.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label ? <span className="text-xs font-semibold">{label}</span> : null}
    </button>
  );
}
