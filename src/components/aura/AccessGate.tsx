import { useState } from "react";
type Stage = 0 | 1 | 2;
const STAGES = [
  {
    label: "Identity assertion",
    hint: "Configured account email",
    placeholder: "operator@domain",
    type: "email",
  },
  { label: "Authenticator", hint: "6-digit TOTP code", placeholder: "••••••", type: "text" },
  {
    label: "Session key",
    hint: "Server-side session key",
    placeholder: "••••••••••",
    type: "password",
  },
] as const;
export function AccessGate({ onGranted }: { onGranted: () => void }) {
  const [stage, setStage] = useState<Stage>(0);
  const [values, setValues] = useState(["", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const current = STAGES[stage];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!values[stage]?.trim()) {
      setError("Required assertion missing.");
      return;
    }
    if (stage < 2) {
      setStage((stage + 1) as Stage);
      return;
    }
    setChecking(true);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: values[0], totp: values[1], sessionKey: values[2] }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Authentication failed");
      onGranted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed");
      setStage(0);
    } finally {
      setChecking(false);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="label-hud">Artificial Unified Response &amp; Analytics Network</p>
          <h1 className="text-glow mt-3 text-3xl font-bold text-primary">AURA-NET</h1>
          <p className="mt-3 text-xs text-muted-foreground">Server-verified command perimeter.</p>
        </div>
        <div className="panel scanline rounded-lg p-6">
          <div className="mt-5 flex items-center justify-between">
            <span className="label-hud">Factor {stage + 1} / 3</span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={
                    i < stage
                      ? "h-1.5 w-8 rounded-full bg-success"
                      : i === stage
                        ? "h-1.5 w-8 rounded-full bg-primary pulse-node"
                        : "h-1.5 w-8 rounded-full bg-muted"
                  }
                />
              ))}
            </div>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="label-hud" htmlFor="factor">
              {current.label}
            </label>
            <input
              id="factor"
              type={current.type}
              autoComplete="off"
              value={values[stage]}
              onChange={(e) =>
                setValues((old) => old.map((v, i) => (i === stage ? e.target.value : v)))
              }
              placeholder={current.placeholder}
              className="mt-2 w-full rounded border border-input bg-background/70 px-3 py-2.5 font-mono text-sm text-foreground outline-none"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">{current.hint}</p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={checking}
              className="mt-4 w-full rounded bg-primary px-4 py-2.5 font-display text-xs tracking-[0.2em] text-primary-foreground uppercase disabled:opacity-60"
            >
              {checking ? "Verifying…" : stage === 2 ? "Authenticate" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
