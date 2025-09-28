"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      const controller = new AbortController();
      const register = async () => {
        try {
          await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        } catch {
          // ignore
        }
      };
      register();
      return () => controller.abort();
    }
  }, []);
  return null;
}

