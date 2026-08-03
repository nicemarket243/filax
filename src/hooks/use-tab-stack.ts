import { useCallback, useState } from "react";

/**
 * Pile de navigation interne aux modules FILAX.
 * Permet au bouton « retour » de revenir à l'onglet précédent
 * au lieu de quitter directement la page vers l'accueil.
 */
export function useTabStack<T extends string>(initial: T) {
  const [stack, setStack] = useState<T[]>([initial]);
  const tab = stack[stack.length - 1];

  const setTab = useCallback((next: T) => {
    setStack((prev) => (prev[prev.length - 1] === next ? prev : [...prev, next]));
  }, []);

  const goBackTab = useCallback(() => {
    let handled = false;
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      handled = true;
      return prev.slice(0, -1);
    });
    return handled;
  }, []);

  const canGoBackTab = stack.length > 1;

  return { tab, setTab, goBackTab, canGoBackTab } as const;
}
