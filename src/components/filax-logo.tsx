import filaxLogo from "@/assets/filax-logo.png.asset.json";

interface FilaxLogoProps {
  className?: string;
  /** Rendered height of the logo in pixels. */
  height?: number;
}

/**
 * Official FILAX brand logo — the original finalized artwork, used exactly as
 * provided (no redesign, recoloring or reproportioning).
 */
export function FilaxLogo({ className, height = 44 }: FilaxLogoProps) {
  return (
    <img
      src={filaxLogo.url}
      alt="FILAX Finance"
      height={height}
      style={{ height }}
      className={`w-auto select-none ${className ?? ""}`}
      draggable={false}
    />
  );
}
