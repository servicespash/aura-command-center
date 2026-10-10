import React, { useEffect, useState } from "react";
import { LocalCredentialManager } from "@/services/security/LocalCredentialManager";

// Extend global window for diagnosticLogs
declare global {
  interface Window {
    diagnosticLogs?: Array<{ timestamp: string; level: string; message: string; error?: unknown }>;
  }
}

export function VaultDiagnosticsProvider({ children }: { children: React.ReactNode }) {
  const [systemBlocked, setSystemBlocked] = useState<boolean>(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  useEffect(() => {
    // Initialize global diagnosticLogs if not present
    if (typeof window !== "undefined" && !window.diagnosticLogs) {
      window.diagnosticLogs = [];
    }

    const logDiagnostic = (
      level: "INFO" | "SUCCESS" | "ERROR" | "WARN",
      message: string,
      error?: unknown,
    ) => {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        error: error instanceof Error ? error.message : error,
      };
      console.log(`[VaultDiagnosticsProvider] [${level}] ${message}`, error || "");
      if (typeof window !== "undefined" && window.diagnosticLogs) {
        window.diagnosticLogs.push(entry);
      }
    };

    logDiagnostic("INFO", "Executing early-boot local storage initialization try-catch block...");

    try {
      if (typeof window === "undefined" || !window.localStorage) {
        throw new Error("Window or localStorage environment is undefined.");
      }

      const diagnostic = LocalCredentialManager.checkLocalStoragePermissions();
      if (!diagnostic.success) {
        throw new Error(diagnostic.error || "Storage permission probe failed.");
      }

      logDiagnostic("SUCCESS", "Early-boot local storage initialization verified successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logDiagnostic("ERROR", `Early-boot local storage initialization crashed: ${msg}`, err);
      setSystemBlocked(true);
      setBlockReason(msg);
    }
  }, []);

  if (systemBlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8 bg-background text-foreground">
        <div className="w-full max-w-md panel border border-destructive/60 bg-card p-6 sm:p-8 space-y-6 shadow-2xl text-center">
          <div className="size-4 rounded-full bg-destructive mx-auto animate-ping" />
          <div>
            <h1 className="text-base font-bold font-display text-destructive uppercase tracking-widest">
              SYSTEM BLOCKED — LOCAL STORAGE RESTRICTED
            </h1>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Early-boot cryptographic vault initialization encountered a fatal sandbox storage
              exception. The application cannot persist state or authenticate.
            </p>
          </div>

          <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-left font-mono text-xs text-destructive break-all">
            <span className="font-bold block mb-1">Fatal Exception:</span>
            {blockReason || "Unknown storage restriction."}
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            className="w-full rounded bg-primary py-3 text-xs font-display text-primary-foreground uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg cursor-pointer"
          >
            Reboot Vault &amp; Retry
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
