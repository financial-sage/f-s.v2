"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(onStoreChange);

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  media.addEventListener("change", onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

/** Tracks `html.dark` so list icon chips can bump contrast when the theme flips. */
export function useIsDark() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
