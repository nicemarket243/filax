const PREFIX = "filax-private-cache:v1:";
const memory = new Map<string, unknown>();

function key(namespace: string, userId: string) {
  return `${PREFIX}${namespace}:${userId}`;
}

/** Cache de session, strictement cloisonné par utilisateur et jamais envoyé à un tiers. */
export function readFilaxCache<T>(namespace: string, userId: string | null): T | null {
  if (!userId || typeof window === "undefined") return null;
  const cacheKey = key(namespace, userId);
  if (memory.has(cacheKey)) return memory.get(cacheKey) as T;
  try {
    const raw = window.sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: T };
    if (parsed.value === undefined) return null;
    memory.set(cacheKey, parsed.value);
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeFilaxCache<T>(namespace: string, userId: string, value: T) {
  const cacheKey = key(namespace, userId);
  memory.set(cacheKey, value);
  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify({ value }));
  } catch {
    // La mémoire reste disponible si le stockage du navigateur est plein ou bloqué.
  }
}

export function clearFilaxCache() {
  memory.clear();
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const storedKey = window.sessionStorage.key(i);
      if (storedKey?.startsWith(PREFIX)) keys.push(storedKey);
    }
    keys.forEach((storedKey) => window.sessionStorage.removeItem(storedKey));
  } catch {
    // Rien à faire : les règles d'accès côté serveur restent la barrière de sécurité.
  }
}
