import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AccessGate } from "@/components/aura/AccessGate";
import { CommandDeck } from "@/components/aura/CommandDeck";
import { RecoveryPortal } from "@/components/aura/RecoveryPortal";
import { LocalCredentialManager } from "@/services/security/LocalCredentialManager";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURA-NET · Threat Intelligence Command Deck" },
      {
        name: "description",
        content:
          "AURA-NET is a hardened single-architect command deck for global threat telemetry, cinematic GeoIP mapping and multi-domain perimeter monitoring.",
      },
      { property: "og:title", content: "AURA-NET · Threat Intelligence Command Deck" },
      {
        property: "og:description",
        content:
          "Cinematic earth threat map, ghost-node egress mesh and multi-tenant domain telemetry in one command interface.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [granted, setGranted] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);

  // Auto-sync listener & session restoration on mount
  useEffect(() => {
    const isVaultActive = LocalCredentialManager.isSessionActive();
    if (isVaultActive) {
      setGranted(true);
    } else {
      // Check if profile exists but active session token is missing/corrupted
      const profile = LocalCredentialManager.getProfile();
      if (profile && !isVaultActive) {
        // We have a profile, but session needs recovery check or re-auth
        // If there's a stored profile, we can offer RecoveryPortal if they were previously active
        const lastActive = profile.lastActive || 0;
        const withinWindow = Date.now() - lastActive < 24 * 60 * 60 * 1000; // 24 hours
        if (withinWindow) {
          setNeedsRecovery(true);
        }
      }
    }
  }, []);

  const grant = useCallback(() => {
    setGranted(true);
    setNeedsRecovery(false);
  }, []);

  const handleLock = useCallback(() => {
    LocalCredentialManager.clearVault();
    setGranted(false);
    setNeedsRecovery(false);
  }, []);

  const handleFullSignOut = useCallback(() => {
    LocalCredentialManager.clearVault();
    setNeedsRecovery(false);
    setGranted(false);
  }, []);

  if (needsRecovery && !granted) {
    return (
      <div className="relative min-h-screen bg-background text-foreground">
        <CommandDeck onLock={handleLock} />
        <RecoveryPortal
          onRecovered={() => {
            setNeedsRecovery(false);
            setGranted(true);
          }}
          onFullSignOut={handleFullSignOut}
        />
      </div>
    );
  }

  return granted ? <CommandDeck onLock={handleLock} /> : <AccessGate onGranted={grant} />;
}
