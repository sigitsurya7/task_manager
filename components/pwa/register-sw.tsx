"use client";

import { useEffect } from "react";

export function RegisterSW() {
  // No-op registration; additionally, proactively unregister any existing SW
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister().catch(() => undefined)));
        } catch {}
        try {
          // Clear only our app caches (tm-cache-*) left by previous SW versions
          const keys = await caches.keys();
          await Promise.all(keys.filter((k) => k.startsWith("tm-cache-")).map((k) => caches.delete(k)));
        } catch {}
      })();
    }
  }, []);
  return null;
}
