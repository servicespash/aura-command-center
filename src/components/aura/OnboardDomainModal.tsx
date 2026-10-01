import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateTelemetryKey, generateTxtToken } from "./data";

export function OnboardDomainModal({
  onAdd,
}: {
  onAdd: (domain: string, method: string, key: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "pending" | "verified" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setDomain("");
    setToken("");
    setKey("");
    setStatus("idle");
    setError(null);
  };

  const prepareVerification = () => {
    const normalized = domain.trim().toLowerCase();
    if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(normalized)) {
      setError("Enter a valid fully-qualified domain.");
      return;
    }
    setDomain(normalized);
    setToken(generateTxtToken());
    setStatus("idle");
    setError(null);
    setStep(2);
  };

  const verify = async () => {
    setStatus("checking");
    setError(null);
    try {
      const response = await fetch("/api/onboarding/domain/verify", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({ domain, token }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        status?: "verified" | "pending";
        error?: string;
      };

      if (payload.ok && payload.status === "verified") {
        const newKey = generateTelemetryKey();
        setKey(newKey);
        setStatus("verified");
        onAdd(domain, "DNS TXT", newKey);
        setStep(3);
        return;
      }

      setStatus("pending");
      setError(payload.error || "Verification TXT record was not found.");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Verification failed");
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && reset()}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-xs">
          + ONBOARD DOMAIN
        </Button>
      </DialogTrigger>
      <DialogContent className="panel sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Onboard New Perimeter</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 1 && (
            <div className="space-y-4">
              <Label htmlFor="onboard-domain">Domain Name</Label>
              <Input
                id="onboard-domain"
                placeholder="app.secure.io"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button onClick={prepareVerification}>Continue</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded border border-primary/20 bg-primary/5 p-3 font-mono text-xs">
                <div className="text-muted-foreground">Create this DNS TXT record:</div>
                <div className="mt-2 break-all text-primary">_aura-verify.{domain}</div>
                <div className="mt-1 break-all text-foreground">{token}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Verification performs a real DNS TXT lookup. No domain is marked verified merely because this button was pressed.
              </p>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={verify} disabled={status === "checking"}>
                  {status === "checking" ? "Checking DNS…" : "Verify DNS"}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <p className="text-success">DOMAIN VERIFIED</p>
              <p className="text-xs text-muted-foreground">Local telemetry key issued:</p>
              <p className="break-all font-mono text-xs text-primary">{key}</p>
              <Button onClick={reset}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
