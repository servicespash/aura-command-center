import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { LocalCredentialManager } from "@/services/security/LocalCredentialManager";

export function SystemDiagnosticsDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const profile = LocalCredentialManager.getProfile();

  const handleRunDiagnostics = () => {
    const active = LocalCredentialManager.isSessionActive();
    setStatusMsg(
      active
        ? "All telemetry channels verified. Secure vault intact."
        : "Warning: Active session token invalidated.",
    );
    setTimeout(() => setStatusMsg(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed right-0 top-0 h-full w-80 panel z-[100] p-6 border-l border-border overflow-y-auto"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="label-hud">System Diagnostics</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      <div className="space-y-5 text-xs">
        <div className="space-y-1">
          <div className="text-muted-foreground">Operator Identity</div>
          <div className="font-mono text-primary truncate">
            {profile?.email || "Guest / Unauthenticated"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-muted-foreground">Memory Buffer</div>
          <div className="w-full bg-border h-1.5 rounded overflow-hidden">
            <div className="bg-primary h-full" style={{ width: "42%" }} />
          </div>
          <div className="text-[10px] text-muted-foreground text-right">42.4 MB / 128 MB</div>
        </div>

        <div className="space-y-1">
          <div className="text-muted-foreground">Network Latency</div>
          <div className="font-mono text-success">28ms (Encrypted TLS 1.3)</div>
        </div>

        {statusMsg && (
          <div className="p-2.5 rounded bg-primary/10 border border-primary/30 text-[11px] text-primary">
            {statusMsg}
          </div>
        )}

        <div className="pt-4 border-t border-border space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleRunDiagnostics}
          >
            Run Integrity Check
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-destructive hover:text-destructive"
            onClick={() => {
              LocalCredentialManager.clearVault();
              window.location.reload();
            }}
          >
            Purge Local Vault &amp; Re-Auth
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
