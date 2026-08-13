import mark from "@/assets/filax-mark.png.asset.json";
import word from "@/assets/filax-word.png.asset.json";

interface FilaxLogoProps {
  className?: string;
  /** Rendered height of the logo in pixels. */
  height?: number;
}

/**
 * Logo FILAX officiel : le symbole conserve ses couleurs d'origine, tandis que
 * le mot « FILAX » est peint avec la couleur courante du texte (noir en thème
 * clair, blanc en thème sombre) via un masque alpha.
 */
export function FilaxLogo({ className, height = 44 }: FilaxLogoProps) {
  return (
    <span
      className={`inline-flex select-none items-center gap-[0.35em] align-middle text-foreground ${className ?? ""}`}
      style={{ height }}
      role="img"
      aria-label="FILAX Finance"
    >
      <img src={mark.url} alt="" style={{ height }} className="w-auto" draggable={false} />
      <span
        aria-hidden
        style={{
          height: height * 0.78,
          width: height * 0.78 * (1147 / 552),
          backgroundColor: "currentColor",
          WebkitMaskImage: `url(${word.url})`,
          maskImage: `url(${word.url})`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          display: "block",
        }}
      />
    </span>
  );
}
