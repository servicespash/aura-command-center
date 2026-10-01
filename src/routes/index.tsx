import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { AccessGate } from "@/components/aura/AccessGate";
import { CommandDeck } from "@/components/aura/CommandDeck";

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
  const grant = useCallback(() => setGranted(true), []);
  return granted ? (
    <CommandDeck onLock={() => setGranted(false)} />
  ) : (
    <AccessGate onGranted={grant} />
  );
}
