"use client";

import { useCallback, useEffect, useState } from "react";
import { getIsSuperAdminAction } from "@/app/actions/admin";
import {
  SIMPLE_MODE_CHANGE_EVENT,
  SIMPLE_MODE_STORAGE_KEY,
  ensureSimpleModeCookie,
  readStoredSimpleMode,
  writeStoredSimpleMode,
} from "@/lib/simpleMode";

/**
 * Simple Mode (beta) — only effective for superadmins.
 * Non-admins always see classic UI even if a stale cookie exists.
 */
export function useSimpleMode() {
  const [enabled, setEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getIsSuperAdminAction()
      .then((ok) => {
        if (cancelled) return;
        setIsSuperAdmin(ok);
        if (!ok) {
          if (readStoredSimpleMode()) {
            writeStoredSimpleMode(false);
          }
          setEnabledState(false);
        } else {
          const stored = readStoredSimpleMode();
          setEnabledState(stored);
          ensureSimpleModeCookie(stored);
        }
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setIsSuperAdmin(false);
        setEnabledState(false);
        setHydrated(true);
      });

    const sync = () => {
      if (!cancelled) setEnabledState(readStoredSimpleMode());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === SIMPLE_MODE_STORAGE_KEY || event.key === null) sync();
    };

    window.addEventListener(SIMPLE_MODE_CHANGE_EVENT, sync);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener(SIMPLE_MODE_CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setEnabled = useCallback(
    (next: boolean) => {
      if (!isSuperAdmin) return;
      writeStoredSimpleMode(next);
      setEnabledState(next);
    },
    [isSuperAdmin],
  );

  return {
    enabled: isSuperAdmin && enabled,
    setEnabled,
    hydrated,
    isSuperAdmin,
  };
}
