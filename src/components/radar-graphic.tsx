interface RadarGraphicProps {
  className?: string;
}

/**
 * Decorative concentric-circle radar with a green dot matrix at its core,
 * matching the FILAX hero visual.
 */
export function RadarGraphic({ className }: RadarGraphicProps) {
  // Build a circular dot matrix: dots get larger toward the center.
  const dots: { cx: number; cy: number; r: number; o: number }[] = [];
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
      dots.push({ cx: x, cy: y, r: 1.4 + t * 3.4, o: 0.35 + t * 0.55 });
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
        <circle cx="100" cy="100" r="92" stroke="oklch(0.74 0.2 148 / 0.18)" strokeWidth="1" />
        <circle
          cx="100"
          cy="100"
          r="70"
          stroke="oklch(0.74 0.2 148 / 0.28)"
          strokeWidth="1"
          className="origin-center animate-pulse-ring"
        />

        {/* Orbiting accent dots */}
        <circle cx="190" cy="105" r="4" fill="oklch(0.74 0.2 148)" />
        <circle cx="64" cy="178" r="3.4" fill="oklch(0.74 0.2 148)" />

        {dots.map((d, idx) => (
          <circle key={idx} cx={d.cx} cy={d.cy} r={d.r} fill={`oklch(0.74 0.2 148 / ${d.o})`} />
        ))}
      </svg>
    </div>
  );
}
