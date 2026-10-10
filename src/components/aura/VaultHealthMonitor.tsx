import { useEffect, useState } from "react";
import { LocalCredentialManager } from "@/services/security/LocalCredentialManager";

export function VaultHealthMonitor() {
  const [status, setStatus] = useState<"STORAGE_STABLE" | "STORAGE_SANDBOX_BLOCKED">(
    "STORAGE_STABLE",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<number>(Date.now());

  useEffect(() => {
    const checkHealth = () => {
      const res = LocalCredentialManager.checkLocalStoragePermissions();
      setLastChecked(Date.now());
      if (res.success) {
        setStatus("STORAGE_STABLE");
        setErrorMessage(null);
      } else {
        setStatus("STORAGE_SANDBOX_BLOCKED");
        setErrorMessage(res.error || "Storage write/read restricted.");
      }
    };

    // Initial check
    checkHealth();

    // Poll every 5 seconds
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded border border-primary/20 bg-card/80 p-3 text-xs font-mono shadow-md backdrop-blur-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span
          className={`size-2.5 rounded-full ${
            status === "STORAGE_STABLE"
              ? "bg-success shadow-[0_0_8px_var(--color-success)] animate-pulse"
              : "bg-destructive shadow-[0_0_8px_var(--color-destructive)] animate-ping"
          }`}
        />
        <div>
          <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">
            Vault Storage Health
          </span>
          <span
            className={`font-bold tracking-wide ${
              status === "STORAGE_STABLE" ? "text-success" : "text-destructive"
            }`}
          >
            {status}
          </span>
          {errorMessage && (
            <p className="text-[10px] text-destructive mt-0.5 max-w-xs break-words">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground font-mono text-right">
        <span>Poll: 5s</span>
        <span className="block text-[9px] opacity-70">
          {new Date(lastChecked).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
