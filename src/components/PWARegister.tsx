"use client";

import { useEffect } from "react";
import { ensurePushSubscription } from "@/lib/push-client";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await registration.update();
        // Prompt once on first register when VAPID is configured.
        void ensurePushSubscription(registration, { promptIfNeeded: true });
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    void register();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void navigator.serviceWorker.getRegistration().then((reg) => {
        void reg?.update();
        // Refresh endpoint silently if already granted (never re-prompt).
        if (reg) void ensurePushSubscription(reg);
      });
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
