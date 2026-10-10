import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { generateTotp, LocalCredentialManager } from "@/services/security/LocalCredentialManager";
import { StorageDiagnosticOverlay } from "@/components/aura/StorageDiagnosticOverlay";
import { VaultHealthMonitor } from "@/components/aura/VaultHealthMonitor";
import { DiagnosticDashboard } from "@/components/aura/DiagnosticDashboard";
import { useVaultInitializationTracer } from "@/hooks/useVaultInitializationTracer";
import { useInitializationWatchdog } from "@/hooks/useInitializationWatchdog";

export function AccessGate({ onGranted }: { onGranted: () => void }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const profile = useAuthStore((state) => state.profile);
  const provisionedCreds = useAuthStore((state) => state.provisionedCreds);
  const mode = useAuthStore((state) => state.mode);
  const error = useAuthStore((state) => state.error);
  const toastMsg = useAuthStore((state) => state.toastMsg);
  const isProvisioning = useAuthStore((state) => state.isProvisioning);
  const checking = useAuthStore((state) => state.checking);

  const checkSession = useAuthStore((state) => state.checkSession);
  const setMode = useAuthStore((state) => state.setMode);
  const provisionAccount = useAuthStore((state) => state.provisionAccount);
  const authenticate = useAuthStore((state) => state.authenticate);
  const dismissToast = useAuthStore((state) => state.dismissToast);
  const clearProvisionedCreds = useAuthStore((state) => state.clearProvisionedCreds);

  const { attemptCount, hasExceededMaxAttempts, recordAttempt, resetAttempts, MAX_INIT_ATTEMPTS } =
    useVaultInitializationTracer();

  const {
    status: watchdogStatus,
    elapsedTimeMs,
    resetStorageAndRetry,
  } = useInitializationWatchdog(isInitialized, () => {
    resetAttempts();
    checkSession();
  });

  const [emailInput, setEmailInput] = useState("");
  const [totpInput, setTotpInput] = useState("");
  const [sessionKeyInput, setSessionKeyInput] = useState("");

  // Live TOTP preview for convenience
  const [liveCode, setLiveCode] = useState<string>("------");
  const [timeRemaining, setTimeRemaining] = useState<number>(30);

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitialized && !hasExceededMaxAttempts && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      recordAttempt("CHECK_SESSION_INIT");
      checkSession();
    }
  }, [isInitialized, hasExceededMaxAttempts, recordAttempt, checkSession]);

  useEffect(() => {
    if (isAuthenticated) {
      onGranted();
    }
  }, [isAuthenticated, onGranted]);

  useEffect(() => {
    const prof = LocalCredentialManager.getProfile();
    if (prof) {
      setEmailInput(prof.email);
      setSessionKeyInput(prof.sessionKey);
    }
  }, []);

  // Live TOTP timer & code updater
  useEffect(() => {
    let active = true;
    const updateCode = async () => {
      const activeProf = provisionedCreds || profile || LocalCredentialManager.getProfile();
      if (!activeProf) return;
      const epoch = Math.floor(Date.now() / 1000);
      const remaining = 30 - (epoch % 30);
      if (active) setTimeRemaining(remaining);
      try {
        const counter = Math.floor(Date.now() / 30000);
        const code = await generateTotp(activeProf.totpSecret, counter);
        if (active) setLiveCode(code);
      } catch {
        if (active) setLiveCode("000000");
      }
    };

    void updateCode();
    const interval = setInterval(updateCode, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [profile, provisionedCreds]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[AccessGate] Provision form submitted with email:", emailInput);
    provisionAccount(emailInput);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[AccessGate] Sign-in form submitted for:", emailInput);
    const success = await authenticate(emailInput, totpInput, sessionKeyInput);
    if (success) {
      setTimeout(() => {
        onGranted();
      }, 400);
    }
  };

  const handleAutoFillAndEnter = async () => {
    const activeProf = provisionedCreds || profile || LocalCredentialManager.getProfile();
    if (!activeProf) return;
    setEmailInput(activeProf.email);
    setSessionKeyInput(activeProf.sessionKey);
    const counter = Math.floor(Date.now() / 30000);
    const currentCode = await generateTotp(activeProf.totpSecret, counter);
    setTotpInput(currentCode);
  };

  if (hasExceededMaxAttempts || watchdogStatus === "INITIALIZATION_FAILED") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8 bg-background text-foreground">
        <div className="w-full max-w-md panel border border-destructive/50 bg-card p-6 text-center space-y-4 shadow-2xl">
          <div className="size-3 rounded-full bg-destructive mx-auto animate-ping" />
          <h2 className="text-sm font-bold font-display text-destructive uppercase tracking-widest">
            INITIALIZATION_FAILED (Vault Hang Detected)
          </h2>
          <p className="text-xs text-muted-foreground">
            Vault initialization hung for {(elapsedTimeMs / 1000).toFixed(1)}s or exceeded max
            attempts ({MAX_INIT_ATTEMPTS}). Local storage sandbox may be locked or restricted.
          </p>
          <button
            type="button"
            onClick={() => {
              hasInitializedRef.current = false;
              resetStorageAndRetry();
            }}
            className="w-full rounded bg-destructive py-2.5 text-xs font-display text-destructive-foreground uppercase tracking-widest hover:bg-destructive/90 transition-all cursor-pointer shadow-lg"
          >
            Clear Storage &amp; Hard Reset Vault
          </button>
        </div>
      </main>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center font-mono text-xs text-primary animate-pulse space-y-2">
          <p>Initializing Local Cryptographic Vault…</p>
          <p className="text-[10px] text-muted-foreground">
            Attempt {attemptCount} of {MAX_INIT_ATTEMPTS} · Elapsed:{" "}
            {(elapsedTimeMs / 1000).toFixed(1)}s
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 bg-background text-foreground overflow-y-auto">
      {/* Real-time Diagnostic Dashboard */}
      <DiagnosticDashboard />

      {/* Storage Diagnostic Exception Overlay */}
      <StorageDiagnosticOverlay />

      {/* Toast Notification / Status Badge */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 rounded border border-success/40 bg-card/95 px-4 py-3 text-xs text-success shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-success animate-ping" />
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={dismissToast}
            className="ml-3 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="w-full max-w-lg my-auto">
        <div className="mb-6 text-center">
          <p className="label-hud">Zero-OIDC Local Vault · Cryptographic Perimeter</p>
          <h1 className="text-glow mt-2 text-2xl sm:text-3xl font-bold text-primary">
            AURA-NET SECURE GATE
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Zustand AuthStore &amp; LocalCredentialManager
          </p>
        </div>

        <div className="panel scanline rounded-lg p-5 sm:p-6 space-y-5 border border-primary/20 bg-background/90 shadow-2xl max-h-[85vh] overflow-y-auto overscroll-contain">
          {/* Storage Health Monitor */}
          <VaultHealthMonitor />

          {/* Mode Switcher */}
          <div className="flex border-b border-primary/10 pb-3 text-xs font-display tracking-wider">
            <button
              type="button"
              onClick={() => {
                console.log("[AccessGate] Clicked Sign-In Tab");
                setMode("signin");
                clearProvisionedCreds();
                const p = LocalCredentialManager.getProfile();
                if (p) {
                  setEmailInput(p.email);
                  setSessionKeyInput(p.sessionKey);
                }
              }}
              className={`flex-1 pb-2 text-center transition-colors uppercase cursor-pointer select-none ${
                mode === "signin" && !provisionedCreds
                  ? "border-b-2 border-primary text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              3-Factor Sign-In
            </button>
            <button
              type="button"
              onClick={() => {
                console.log("[AccessGate] Clicked Provision New Account Tab");
                setMode("register");
                clearProvisionedCreds();
              }}
              className={`flex-1 pb-2 text-center transition-colors uppercase cursor-pointer select-none ${
                mode === "register" || provisionedCreds
                  ? "border-b-2 border-primary text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Provision New Account
            </button>
          </div>

          {error && (
            <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {provisionedCreds ? (
            <div className="space-y-4 rounded border border-primary/30 bg-primary/5 p-4 animate-in fade-in">
              <div className="text-center">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">
                  Synthetic Verifiers Generated &amp; Saved
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">
                  AuthStore has successfully generated and persisted your synthetic TOTP and session
                  key pair. Save these securely now.
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs bg-background/80 p-3 rounded border border-border">
                <div>
                  <span className="text-muted-foreground text-[10px] block">
                    1. TOTP Authenticator Secret:
                  </span>
                  <strong className="text-primary tracking-wide text-sm select-all">
                    {provisionedCreds.totpSecret}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">
                    2. Active Session Key:
                  </span>
                  <strong className="text-foreground tracking-wide text-[11px] select-all break-all">
                    {provisionedCreds.sessionKey}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearProvisionedCreds();
                  setMode("signin");
                  handleAutoFillAndEnter();
                }}
                className="w-full rounded bg-primary px-4 py-3 font-display text-xs tracking-[0.2em] text-primary-foreground uppercase hover:bg-primary/90 transition-all shadow-lg cursor-pointer"
              >
                Proceed to Sign-In With Credentials
              </button>
            </div>
          ) : mode === "register" ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="label-hud block mb-2" htmlFor="reg-email">
                  Operator Identity Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="operator@aura.net"
                  className="w-full rounded border border-input bg-background/70 px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  AuthStore &amp; LocalCredentialManager will generate and persist your credentials
                  in encrypted local storage immediately.
                </p>
              </div>

              <button
                type="submit"
                disabled={isProvisioning}
                className="w-full rounded bg-primary px-4 py-3 font-display text-xs tracking-[0.2em] text-primary-foreground uppercase hover:bg-primary/90 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isProvisioning ? "Provisioning..." : "Generate & Persist Credentials"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              {!profile && (
                <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center justify-between">
                  <span>No local account found.</span>
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="underline text-amber-300 font-bold hover:text-white cursor-pointer"
                  >
                    Provision New Account
                  </button>
                </div>
              )}

              <div>
                <label className="label-hud block mb-1" htmlFor="auth-email">
                  Factor 1: Identity Assertion (Email)
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="operator@aura.net"
                  className="w-full rounded border border-input bg-background/70 px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="label-hud" htmlFor="auth-totp">
                    Factor 2: 6-Digit Authenticator Code (TOTP)
                  </label>
                  {profile && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                        Live Code:{" "}
                        <strong className="text-foreground tracking-widest">{liveCode}</strong> (
                        {timeRemaining}s)
                      </span>
                      <button
                        type="button"
                        onClick={() => setTotpInput(liveCode)}
                        className="text-[10px] font-display uppercase bg-primary/20 hover:bg-primary/30 text-primary px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        Fill
                      </button>
                    </div>
                  )}
                </div>
                <input
                  id="auth-otp"
                  type="text"
                  maxLength={6}
                  required
                  value={totpInput}
                  onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full rounded border border-input bg-background/70 px-3 py-2.5 font-mono text-lg tracking-widest text-foreground outline-none focus:border-primary text-center"
                />
              </div>

              <div>
                <label className="label-hud block mb-1" htmlFor="auth-session">
                  Factor 3: Session Key
                </label>
                <input
                  id="auth-session"
                  type="password"
                  required
                  value={sessionKeyInput}
                  onChange={(e) => setSessionKeyInput(e.target.value)}
                  placeholder="sk_aura_..."
                  className="w-full rounded border border-input bg-background/70 px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              {profile && (
                <div className="rounded border border-primary/25 bg-background/50 p-3 text-[11px] space-y-1 font-mono text-muted-foreground">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-primary font-bold">Local Vault Reference:</span>
                    <button
                      type="button"
                      onClick={handleAutoFillAndEnter}
                      className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded hover:bg-primary/90 uppercase font-display cursor-pointer"
                    >
                      Auto-Fill All
                    </button>
                  </div>
                  <div>
                    TOTP Secret: <span className="text-foreground">{profile.totpSecret}</span>
                  </div>
                  <div>
                    Session Key: <span className="text-foreground">{profile.sessionKey}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={checking || !profile}
                className="w-full rounded bg-primary px-4 py-3 font-display text-xs tracking-[0.2em] text-primary-foreground uppercase hover:bg-primary/90 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {checking ? "Validating Local Credentials…" : "Authenticate & Open Perimeter"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
