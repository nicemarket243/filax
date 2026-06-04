interface FilaxLogoProps {
  className?: string;
}

/**
 * FILAX brand logo recreated as SVG.
 * - Three ascending green 3D-style bars
 * - A pure white (#FFFFFF) ascending arrow swooping through the bars
 * - "FINANCE" eyebrow + bold "FILAX" wordmark
 */
export function FilaxLogo({ className }: FilaxLogoProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5">
        <svg
          width="46"
          height="46"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="shrink-0"
        >
          <defs>
            <linearGradient id="filaxBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.82 0.21 145)" />
              <stop offset="55%" stopColor="oklch(0.7 0.2 147)" />
              <stop offset="100%" stopColor="oklch(0.5 0.16 150)" />
            </linearGradient>
            <linearGradient id="filaxBarLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.9 0.18 145)" />
              <stop offset="100%" stopColor="oklch(0.66 0.2 148)" />
            </linearGradient>
          </defs>

          {/* Bars */}
          <rect x="6" y="34" width="13" height="22" rx="2" fill="url(#filaxBar)" />
          <rect x="6" y="34" width="4" height="22" rx="2" fill="url(#filaxBarLight)" />

          <rect x="24" y="22" width="13" height="34" rx="2" fill="url(#filaxBar)" />
          <rect x="24" y="22" width="4" height="34" rx="2" fill="url(#filaxBarLight)" />

          <rect x="42" y="10" width="13" height="46" rx="2" fill="url(#filaxBar)" />
          <rect x="42" y="10" width="4" height="46" rx="2" fill="url(#filaxBarLight)" />

          {/* Pure white ascending arrow */}
          <path
            d="M8 48 C 22 46, 34 38, 50 18"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M40 16 L52 14 L50 26 Z"
            fill="#FFFFFF"
          />
        </svg>

        <div className="leading-none">
          <span className="block text-[0.6rem] font-medium uppercase tracking-[0.35em] text-muted-foreground">
            Finance
          </span>
          <span className="block text-2xl font-extrabold tracking-tight text-foreground">
            FILAX
          </span>
        </div>
      </div>
    </div>
  );
}
