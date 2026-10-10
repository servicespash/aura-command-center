import { useEffect, useState } from "react";
import { LocalCredentialManager } from "@/services/security/LocalCredentialManager";

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "ERROR" | "WARN";
  message: string;
}

export function DiagnosticDashboard() {
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const addLog = (level: DiagnosticLogEntry["level"], message: string) => {
      const entry: DiagnosticLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      };
      setLogs((prev) => [entry, ...prev].slice(0, 50)); // Keep last 50 logs
    };

    addLog("INFO", "DiagnosticDashboard mounted. Initializing vault telemetry observer...");

    const checkStorage = () => {
      const res = LocalCredentialManager.checkLocalStoragePermissions();
      if (res.success) {
        addLog("SUCCESS", "Storage health check passed: STORAGE_STABLE");
      } else {
        addLog("ERROR", `Storage health check failed: STORAGE_SANDBOX_BLOCKED - ${res.error}`);
      }
    };

    checkStorage();
    const interval = setInterval(checkStorage, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded bg-primary/20 hover:bg-primary/30 border border-primary/40 px-3 py-1.5 text-[11px] font-display text-primary uppercase tracking-widest shadow-lg backdrop-blur-md cursor-pointer transition-all flex items-center gap-2"
      >
        <span className="size-2 rounded-full bg-primary animate-pulse" />
        <span>{isOpen ? "Hide Diag Logs" : "Show Vault Diag Logs"}</span>
      </button>

      {isOpen && (
        <div className="mt-2 w-80 sm:w-96 rounded-lg border border-primary/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md font-mono text-xs text-card-foreground animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
            <span className="text-[11px] font-display uppercase tracking-widest text-primary font-bold">
              Vault Telemetry &amp; Diag Feed
            </span>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 overscroll-contain text-[11px]">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No diagnostic events recorded yet.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 border-b border-border/40 pb-1">
                  <span className="text-muted-foreground shrink-0">{log.timestamp}</span>
                  <span
                    className={`shrink-0 font-bold px-1 rounded text-[9px] ${
                      log.level === "SUCCESS"
                        ? "bg-success/20 text-success"
                        : log.level === "ERROR"
                          ? "bg-destructive/20 text-destructive"
                          : log.level === "WARN"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-primary/20 text-primary"
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-foreground break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
