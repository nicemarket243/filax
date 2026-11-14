export type SwipeDirection = -1 | 0 | 1;

/**
 * Un vrai balayage demande soit une distance franche, soit un geste rapide
 * déjà suffisamment engagé. Les petites diagonales ne changent jamais de compte.
 */
export function swipeDirection(distance: number, velocity: number, width: number): SwipeDirection {
  const travel = Math.abs(distance);
  const speed = Math.abs(velocity);
  if (travel < 32 || width <= 0) return 0;
  if (Math.sign(distance) !== Math.sign(velocity) && speed >= 0.65) return 0;

  const distanceReached = travel >= Math.min(96, width * 0.24);
  const fastEnough = travel >= 42 && speed >= 0.65;
  if (!distanceReached && !fastEnough) return 0;
  return distance < 0 ? -1 : 1;
}

/** Verrouille l'axe une fois l'intention claire, puis ne revient jamais dessus. */
export function swipeAxis(dx: number, dy: number): "pending" | "horizontal" | "vertical" {
  const x = Math.abs(dx);
  const y = Math.abs(dy);
  if (Math.max(x, y) < 10) return "pending";
  if (x >= 12 && x > y * 1.2) return "horizontal";
  if (y >= 10 && y > x * 1.05) return "vertical";
  return "pending";
}
