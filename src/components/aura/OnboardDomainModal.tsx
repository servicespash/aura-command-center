import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  const [method, setMethod] = useState<"Google OAuth" | "DNS TXT">("Google OAuth");
  const [key, setKey] = useState("");

  const reset = () => {
    setStep(1);
    setDomain("");
    setMethod("Google OAuth");
  };

  const handleVerify = () => {
    const newKey = generateTelemetryKey();
    setKey(newKey);
    onAdd(domain, method, newKey);
    setStep(4);
  };

  return (
    <Dialog onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-xs">
          + ONBOARD DOMAIN
        </Button>
      </DialogTrigger>
      <DialogContent className="panel sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Onboard New Perimeter</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 1 && (
            <div className="space-y-4">
              <Label>Domain Name</Label>
              <Input
                placeholder="e.g. app.secure.io"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <Label>Verification Method</Label>
              <div className="flex gap-2">
                <Button
                  variant={method === "Google OAuth" ? "default" : "outline"}
                  onClick={() => setMethod("Google OAuth")}
                >
                  Google OAuth
                </Button>
                <Button
                  variant={method === "DNS TXT" ? "default" : "outline"}
                  onClick={() => setMethod("DNS TXT")}
                >
                  DNS TXT
                </Button>
              </div>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {method === "DNS TXT"
                  ? `Add this record to your DNS: ${generateTxtToken()}`
                  : "Redirecting to Google OAuth..."}
              </p>
              <Button onClick={handleVerify}>Verify</Button>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4 text-center">
              <p className="text-success">VERIFIED</p>
              <p className="text-sm">
                Telemetry Key: <span className="font-mono text-xs">{key}</span>
              </p>
              <Button onClick={reset}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
