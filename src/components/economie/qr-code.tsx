interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/** Lightweight deterministic pseudo-QR for premium visual confirmation screens. */
export function QRCode({ value, size = 160, className }: QRCodeProps) {
  const cells = 25;
  // simple hash → bit grid
  const bits: boolean[] = [];
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  const rand = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  for (let i = 0; i < cells * cells; i++) bits.push(rand() > 0.5);

  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, cells - 7) || inBox(cells - 7, 0);
  };

  const unit = size / cells;
  const rects: { x: number; y: number }[] = [];
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (isFinder(r, c)) continue;
      if (bits[r * cells + c]) rects.push({ x: c * unit, y: r * unit });
    }
  }

  const Finder = ({ tx, ty }: { tx: number; ty: number }) => (
    <g transform={`translate(${tx},${ty})`}>
      <rect width={unit * 7} height={unit * 7} rx={unit} fill="currentColor" />
      <rect x={unit} y={unit} width={unit * 5} height={unit * 5} rx={unit * 0.6} fill="#0c0c14" />
      <rect x={unit * 2} y={unit * 2} width={unit * 3} height={unit * 3} rx={unit * 0.4} fill="currentColor" />
    </g>
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {rects.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={unit * 0.86} height={unit * 0.86} rx={unit * 0.25} fill="currentColor" />
      ))}
      <Finder tx={0} ty={0} />
      <Finder tx={(cells - 7) * unit} ty={0} />
      <Finder tx={0} ty={(cells - 7) * unit} />
    </svg>
  );
}
