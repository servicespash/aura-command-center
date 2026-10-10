import { useCallback, useRef, useState } from "react";

export const MAX_INIT_ATTEMPTS = 3;

export function useVaultInitializationTracer() {
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [hasExceededMaxAttempts, setHasExceededMaxAttempts] = useState<boolean>(false);
  const startTimeRef = useRef<number>(Date.now());

  const recordAttempt = useCallback((phase: string, details?: unknown) => {
    setAttemptCount((prev) => {
      const nextCount = prev + 1;
      const elapsed = Date.now() - startTimeRef.current;
      console.group(
        `[VaultInitializationTracer] Phase: ${phase} (Attempt ${nextCount}/${MAX_INIT_ATTEMPTS})`,
      );
      console.log(`Elapsed time since mount: ${elapsed}ms`);
      if (details) {
        console.log("Details:", details);
      }
      console.groupEnd();

      if (nextCount >= MAX_INIT_ATTEMPTS) {
        console.warn(
          `[VaultInitializationTracer] MAX_INIT_ATTEMPTS (${MAX_INIT_ATTEMPTS}) reached! Halting further initialization loops.`,
        );
        setHasExceededMaxAttempts(true);
      }
      return nextCount;
    });
  }, []);

  const resetAttempts = useCallback(() => {
    console.log("[VaultInitializationTracer] Resetting initialization attempt counter.");
    setAttemptCount(0);
    setHasExceededMaxAttempts(false);
    startTimeRef.current = Date.now();
  }, []);

  return {
    attemptCount,
    hasExceededMaxAttempts,
    recordAttempt,
    resetAttempts,
    MAX_INIT_ATTEMPTS,
  };
}
