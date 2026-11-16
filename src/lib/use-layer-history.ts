import { useEffect, useId, useRef } from "react";

type LayerState = { __filaxLayer?: string };
type Layer = { token: string; close: () => void };

/** Open layers, oldest first. Back only ever dismisses the topmost one. */
const stack: Layer[] = [];
/** history.back() calls we issued ourselves; their popstate must not close anything. */
let pendingBacks = 0;
let listening = false;

function onPopState() {
  if (pendingBacks > 0) {
    pendingBacks--;
    // A layer opened while our own back was in flight: restore its entry.
    const top = stack[stack.length - 1];
    const state = (window.history.state ?? {}) as LayerState;
    if (top && state.__filaxLayer !== top.token) {
      window.history.pushState({ ...state, __filaxLayer: top.token }, "", window.location.href);
    }
    return;
  }
  const top = stack.pop();
  top?.close();
}

/**
 * Gives a controlled modal its own same-page history entry. Phone/browser Back
 * dismisses the topmost one; an explicit close removes its entry without changing route.
 */
export function useLayerHistory(
  open: boolean,
  controlled: boolean,
  onOpenChange: ((open: boolean) => void) | undefined,
) {
  const id = useId();
  const callback = useRef(onOpenChange);
  callback.current = onOpenChange;

  useEffect(() => {
    if (!controlled || !open || typeof window === "undefined") return;
    if (!listening) {
      window.addEventListener("popstate", onPopState);
      listening = true;
    }
    const token = `${id}:${Date.now()}`;
    const layer: Layer = { token, close: () => callback.current?.(false) };
    stack.push(layer);
    const current = (window.history.state ?? {}) as LayerState;
    if (pendingBacks === 0) {
      window.history.pushState({ ...current, __filaxLayer: token }, "", window.location.href);
    }
    // else: the pending back's popstate handler will push the entry for the top layer.

    return () => {
      const i = stack.indexOf(layer);
      if (i === -1) return; // already dismissed by Back
      stack.splice(i, 1);
      const state = (window.history.state ?? {}) as LayerState;
      if (state.__filaxLayer === token) {
        pendingBacks++;
        window.history.back();
      }
    };
  }, [controlled, id, open]);

  return (next: boolean) => callback.current?.(next);
}
