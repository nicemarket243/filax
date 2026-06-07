import { useEffect, useState } from "react";

/** Re-renders the component every `ms` milliseconds. Used for live countdowns. */
export function useTick(ms = 1000) {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}
