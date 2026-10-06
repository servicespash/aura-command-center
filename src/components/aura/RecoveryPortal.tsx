import { useState } from "react";
import { LocalCredentialManager } from "@/services/security/LocalCredentialManager";

interface RecoveryPortalProps {
  onRecovered: () => void;
  onFullSignOut: () => void;
}

export function RecoveryPortal({ onRecovered, onFullSignOut }: RecoveryPortalProps) {
  const [sessionKeyInput, setSessionKeyInput] = useState("");
  const [totpInput, setTotpInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const profile = LocalCredentialManager.getProfile();

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRestoring(true);

    try {
      if (!profile) {
        throw new Error("No operator credential vault found. Please sign in again.");
      }

      const result = await LocalCredentialManager.validateCredentials(
        profile.email,
        totpInput,
        sessionKeyInput,
      );

      if (!result.success) {
        throw new Error(result.error || "Session restoration failed.");
      }

      // Success
      onRecovered();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recovery verification failed.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md px-4">
      <div className="w-full max-w-md panel scanline rounded-lg p-6 border border-primary/40 bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="inline-block px-2.5 py-1 mb-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-400 uppercase tracking-widest animate-pulse">
            Session Interrupted / Key Invalid
          </div>
          <h2 className="text-xl font-bold text-primary font-display">SECTOR RECOVERY PORTAL</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Active telemetry session key mismatch or expiration detected for{" "}
            <span className="text-foreground font-mono">{profile?.email || "Operator"}</span>.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleRestore} className="space-y-4">
          <div>
            <label className="label-hud block mb-1" htmlFor="recovery-totp">
              Current Authenticator Code (TOTP)
            </label>
            <input
              id="recovery-totp"
              type="text"
              maxLength={6}
              required
              value={totpInput}
              onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full rounded border border-input bg-background/70 px-3 py-2.5 font-mono text-base tracking-widest text-foreground outline-none focus:border-primary text-center"
            />
          </div>

          <div>
            <label className="label-hud block mb-1" htmlFor="recovery-session">
              Encrypted Session Token Key
            </label>
            <input
              id="recovery-session"
              type="password"
              required
              value={sessionKeyInput}
              onChange={(e) => setSessionKeyInput(e.target.value)}
              placeholder="sk_aura_..."
              className="w-full rounded border border-input bg-background/70 px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
            />
            {profile?.sessionKey && (
              <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                Hint: Vault session key starts with{" "}
                <span className="text-primary">{profile.sessionKey.slice(0, 10)}...</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onFullSignOut}
              className="flex-1 rounded border border-primary/20 bg-background/60 px-4 py-2.5 text-xs font-display uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={restoring}
              className="flex-1 rounded bg-primary px-4 py-2.5 font-display text-xs tracking-[0.15em] text-primary-foreground uppercase hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {restoring ? "Restoring…" : "Restore Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
