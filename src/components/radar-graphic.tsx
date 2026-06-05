interface RadarGraphicProps {
  className?: string;
  /** When true, the dot matrix animates dynamically (voice / text input detected). */
  active?: boolean;
}

/**
 * Decorative concentric-circle radar with a green dot matrix at its core.
 * Dots are kept subtle (semi-transparent) and ripple with a dynamic wave
 * animation when `active` is true.
 */
export function RadarGraphic({ className, active = false }: RadarGraphicProps) {
  // Build a circular dot matrix: dots get larger toward the center.
  const dots: { cx: number; cy: number; r: number; o: number; delay: number }[] = [];
  const cols = 9;
  const rows = 9;
  const spacing = 14;
  const cx0 = 100;
  const cy0 = 100;
  const maxDist = Math.sqrt(2) * ((cols - 1) / 2) * spacing;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const x = cx0 + (j - (cols - 1) / 2) * spacing;
      const y = cy0 + (i - (rows - 1) / 2) * spacing;
      const dist = Math.sqrt((x - cx0) ** 2 + (y - cy0) ** 2);
      if (dist > maxDist * 0.62) continue;
      const t = 1 - dist / (maxDist * 0.62);
      // Subtle base opacity so the dots stay "peu visibles".
      dots.push({
        cx: x,
        cy: y,
        r: 1.4 + t * 3.4,
        o: 0.18 + t * 0.4,
        delay: dist / 90,
      });
    }
  }

  return (
    <div className={className}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="h-full w-full"
      >
        <circle cx="100" cy="100" r="92" stroke="oklch(0.72 0.22 140 / 0.12)" strokeWidth="1" />
        <circle
          cx="100"
          cy="100"
          r="70"
          stroke="oklch(0.72 0.22 140 / 0.2)"
          strokeWidth="1"
          className="origin-center animate-pulse-ring"
        />

        {/* Orbiting accent dots */}
        <circle cx="190" cy="105" r="4" fill="oklch(0.72 0.22 140 / 0.7)" />
        <circle cx="64" cy="178" r="3.4" fill="oklch(0.72 0.22 140 / 0.6)" />

        <g className={active ? "radar-active" : undefined}>
          {dots.map((d, idx) => (
            <circle
              key={idx}
              className="radar-dot"
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              fill={`oklch(0.72 0.22 140 / ${d.o})`}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                animationDelay: `${d.delay}s`,
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
