import { useEffect, useState } from "react";
import { LocalCredentialManager } from "@/services/security/LocalCredentialManager";

export function StorageDiagnosticOverlay() {
  const [diagnosticResult, setDiagnosticResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const res = LocalCredentialManager.runStorageDiagnostic();
    setDiagnosticResult(res);
  }, []);

  if (dismissed || !diagnosticResult || diagnosticResult.success) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50 rounded-lg border border-destructive/50 bg-card/95 p-4 text-card-foreground shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-xs font-bold text-destructive uppercase tracking-wider font-display">
              Storage Sandbox Exception Detected
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            {diagnosticResult.error ||
              "localStorage read/write access is blocked or restricted in this environment."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            const res = LocalCredentialManager.runStorageDiagnostic();
            setDiagnosticResult(res);
          }}
          className="rounded bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 text-[11px] font-display uppercase tracking-wider transition-colors cursor-pointer"
        >
          Re-Run Diagnostic
        </button>
      </div>
    </div>
  );
}
