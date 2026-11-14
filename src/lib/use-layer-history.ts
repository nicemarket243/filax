import { useEffect, useId, useRef } from "react";

type LayerState = { __filaxLayer?: string };

/**
 * Gives a controlled modal its own same-page history entry. Phone/browser Back
 * dismisses it first; an explicit close removes that entry without changing route.
 */
export function useLayerHistory(
  open: boolean,
  controlled: boolean,
  onOpenChange: ((open: boolean) => void) | undefined,
) {
  const id = useId();
  const callback = useRef(onOpenChange);
  callback.current = onOpenChange;
  const entry = useRef<string | null>(null);

  useEffect(() => {
    if (!controlled || !open || typeof window === "undefined") return;
    const token = `${id}:${Date.now()}`;
    entry.current = token;
    const current = (window.history.state ?? {}) as LayerState;
    window.history.pushState(
      { ...current, __filaxLayer: token },
      "",
      window.location.href,
    );

    const onPopState = () => {
      if (entry.current !== token) return;
      entry.current = null;
      callback.current?.(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (entry.current !== token) return;
      entry.current = null;
      const state = (window.history.state ?? {}) as LayerState;
      if (state.__filaxLayer === token) window.history.back();
    };
  }, [controlled, id, open]);

  return (next: boolean) => callback.current?.(next);
}
