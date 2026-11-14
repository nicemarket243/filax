export const TEXT_SIZE_MIN = 80;
export const TEXT_SIZE_MAX = 140;
export const TEXT_SIZE_STEP = 10;
export const TEXT_SIZE_DEFAULT = 100;
export const TEXT_SIZE_KEY = "filax-text-size";

export function normalizeTextSize(value: number) {
  if (!Number.isFinite(value)) return TEXT_SIZE_DEFAULT;
  const stepped = Math.round(value / TEXT_SIZE_STEP) * TEXT_SIZE_STEP;
  return Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, stepped));
}

export function textSizeProgress(size: number) {
  return ((normalizeTextSize(size) - TEXT_SIZE_MIN) / (TEXT_SIZE_MAX - TEXT_SIZE_MIN)) * 100;
}

export function applyTextSize(size: number) {
  const normalized = normalizeTextSize(size);
  document.documentElement.style.fontSize = `${normalized}%`;
  return normalized;
}
