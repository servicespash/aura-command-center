import { useEffect, useState, useCallback } from "react";
import { LocalCredentialManager } from "@/services/security/LocalCredentialManager";

export function useInitializationWatchdog(isInitialized: boolean, onRetry?: () => void) {
  const [status, setStatus] = useState<"PENDING" | "INITIALIZED" | "INITIALIZATION_FAILED">(
    "PENDING",
  );
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);

  useEffect(() => {
    if (isInitialized) {
      setStatus("INITIALIZED");
      return;
    }

    setStatus("PENDING");
    const startTime = Date.now();

    // Timer interval for elapsed time tracking
    const timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTimeMs(elapsed);
    }, 200);

    // 5-second watchdog timeout
    const watchdogTimer = setTimeout(() => {
      if (!isInitialized) {
        console.warn(
          "[InitializationWatchdog] Vault initialization hung for > 5 seconds. Forcing INITIALIZATION_FAILED state.",
        );
        setStatus("INITIALIZATION_FAILED");
      }
    }, 5000);

    return () => {
      clearInterval(timerInterval);
      clearTimeout(watchdogTimer);
    };
  }, [isInitialized]);

  const resetStorageAndRetry = useCallback(() => {
    console.log(
      "[InitializationWatchdog] Manual reset triggered: clearing local storage vault keys...",
    );
    try {
      LocalCredentialManager.clearSession();
      // Also clear any diagnostic probe keys
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.clear();
      }
    } catch (e) {
      console.error("[InitializationWatchdog] Error clearing storage during reset:", e);
    }
    setStatus("PENDING");
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  }, [onRetry]);

  return {
    status,
    elapsedTimeMs,
    resetStorageAndRetry,
  };
}
