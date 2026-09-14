import { useState } from "react";

type Stage = 0 | 1 | 2;

const STAGES = [
  { label: "Identity assertion", hint: "Whitelisted architect email", placeholder: "architect@domain", type: "email" },
  { label: "TOTP / biometric", hint: "6-digit authenticator assertion", placeholder: "••••••", type: "text" },
  { label: "Master session key", hint: "Pre-shared cryptographic key", placeholder: "AURA-••••-••••", type: "password" },
] as const;

/**
 * Three-factor perimeter gate. Presentation only for now — factor verification
 * must run server-side once the backend is enabled.
 */
export function AccessGate({ onGranted }: { onGranted: () => void }) {
  const [stage, setStage] = useState<Stage>(0);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const current = STAGES[stage];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().length < 3) {
      setError("Assertion rejected — insufficient input.");
      return;
    }
    setError(null);
    setChecking(true);
    window.setTimeout(() => {
      setChecking(false);
      setValue("");
      if (stage === 2) onGranted();
      else setStage((s) => (s + 1) as Stage);
    }, 700);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="label-hud">Artificial Unified Response &amp; Analytics Network</p>
          <h1 className="text-glow mt-3 text-3xl font-bold text-primary">AURA-NET</h1>
          <p className="mt-3 text-xs text-muted-foreground">
            Isolated command perimeter. No public registration endpoint exists.
          </p>
        </div>

        <div className="panel scanline rounded-lg p-6">
          <div className="sweep h-px w-1/2" style={{ backgroundImage: "var(--gradient-scan)" }} />

          <div className="mt-5 flex items-center justify-between">
            <span className="label-hud">Factor {stage + 1} / 3</span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 w-8 rounded-full ${
                    i < stage ? "bg-success" : i === stage ? "bg-primary pulse-node" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label-hud" htmlFor="factor">
                {current.label}
              </label>
              <input
                id="factor"
                type={current.type}
                autoComplete="off"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={current.placeholder}
                className="mt-2 w-full rounded border border-input bg-background/70 px-3 py-2.5 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">{current.hint}</p>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={checking}
              className="w-full rounded bg-primary px-4 py-2.5 font-display text-xs tracking-[0.2em] text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {checking ? "Verifying…" : stage === 2 ? "Unseal command deck" : "Assert factor"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Egress obfuscation mesh active · origin fingerprint masked
        </p>
      </div>
    </main>
  );
}
