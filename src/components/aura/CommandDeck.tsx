import { useEffect, useState } from "react";
import { GlobeCanvas } from "./GlobeCanvas";
import {
  EGRESS_NODES,
  SEED_NODES,
  SEED_TENANTS,
  randomEvent,
  type ThreatEvent,
  type Tenant,
  type GeoNode,
} from "./data";
import { OnboardDomainModal } from "./OnboardDomainModal";
import { NodeDetailModal } from "./NodeDetailModal";
import { ToggleSwitch } from "./ToggleSwitch";
import { ScanlineOverlay } from "./ScanlineOverlay";
import { FloatingHUD } from "./FloatingHUD";
import { useKeyboardShortcut } from "@/hooks/use-keyboard";
import { generateSessionReport } from "@/lib/report-utils";
import { Button } from "../ui/button";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

function severityClass(s: ThreatEvent["severity"]) {
  return s === "critical" ? "text-destructive" : s === "medium" ? "text-warning" : "text-primary";
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="panel rounded-lg px-4 py-3">
      <p className="label-hud">{label}</p>
      <p className={`mt-1.5 font-display text-xl font-bold ${tone ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

export function CommandDeck({ onLock }: { onLock: () => void }) {
  const [events, setEvents] = useState<ThreatEvent[]>(() =>
    Array.from({ length: 6 }, () => randomEvent(SEED_NODES)),
  );
  const [egressIndex, setEgressIndex] = useState(0);
  const [tenants, setTenants] = useState<Tenant[]>(SEED_TENANTS);
  const [viewMode, setViewMode] = useState<"left" | "right">("left");
  const [activeNodes, setActiveNodes] = useState(SEED_NODES.length * 214);

  const addTenant = (domain: string, method: string, key: string) => {
    setTenants((prev) => [
      ...prev,
      { domain, status: "verified", method: method as Tenant["method"], key, events24h: 0 },
    ]);
  };

  useKeyboardShortcut("d", () => setEgressIndex((i) => (i + 1) % EGRESS_NODES.length));
  useKeyboardShortcut("k", () => console.log("Search functionality not implemented"));

  const handleGenerateReport = () => {
    generateSessionReport({ tenants, events, activeNodes, egressIndex });
  };

  useEffect(() => {
    let feedTimeout: number;
    const scheduleFeed = () => {
      const delay = 2000 + Math.random() * 3000;
      feedTimeout = window.setTimeout(() => {
        const newEvent = randomEvent(SEED_NODES);
        setEvents((prev) => [newEvent, ...prev].slice(0, 14));
        if (newEvent.severity === "critical") {
          setActiveNodes((prev) => prev + Math.floor(Math.random() * 10));
        }
        scheduleFeed();
      }, delay);
    };
    scheduleFeed();

    const rotate = window.setInterval(() => {
      setEgressIndex((i) => (i + 1) % EGRESS_NODES.length);
    }, 5000);
    return () => {
      window.clearTimeout(feedTimeout);
      window.clearInterval(rotate);
    };
  }, []);

  const [selectedNode, setSelectedNode] = useState<GeoNode | null>(null);

  const critical = events.filter((e) => e.severity === "critical").length;
  const egress = EGRESS_NODES[egressIndex]!;

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 relative">
      <ScanlineOverlay />
      <FloatingHUD />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-hud">Artificial Unified Response &amp; Analytics Network</p>
          <h1 className="text-glow mt-1 text-xl font-bold text-primary sm:text-2xl">AURA-NET</h1>
        </div>
        <div className="flex items-center gap-3">
          <ToggleSwitch 
            labelLeft="Live Feed" 
            labelRight="Archived Data" 
            onChange={setViewMode} 
          />
          <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="pulse-node inline-block h-2 w-2 rounded-full bg-success" />
            telemetry live
          </span>
          <button
            onClick={onLock}
            className="rounded border border-input px-3 py-1.5 font-display text-[10px] tracking-[0.2em] text-foreground uppercase transition-all hover:bg-secondary active:scale-95"
          >
            Seal deck
          </button>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active nodes" value={String(activeNodes)} tone="text-primary" />
        <Stat label="Critical events" value={String(critical * 7 + 3)} tone="text-destructive" />
        <Stat label="Tenant domains" value={String(tenants.length)} />
        <Stat label="Ghost egress" value={egress.id.toUpperCase()} tone="text-warning" />
      </section>

      <section className="mt-4 flex flex-col gap-4 lg:flex-row">
        <div className="panel scanline min-w-0 flex-1 rounded-lg p-3">
          <div className="flex items-center justify-between px-1">
            <p className="label-hud">Cinematic earth · geoip stream</p>
            <p className="text-[10px] text-muted-foreground">offline geoip · zero external latency</p>
          </div>
          <div className="mt-2 h-[320px] sm:h-[420px] w-full">
            <GlobeCanvas nodes={SEED_NODES} selectedId={selectedNode?.id} onSelect={setSelectedNode} />
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-1/3">
          <div className="panel rounded-lg p-4">
            <p className="label-hud">Live threat ingestion</p>
            <ul className="mt-3 space-y-2">
              {events.map((e) => (
                <ContextMenu key={e.id}>
                  <ContextMenuTrigger asChild>
                    <li className="border-b border-border/60 pb-2 last:border-0 cursor-context-menu">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`text-xs ${severityClass(e.severity)}`}>{e.kind}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {e.at.toLocaleTimeString([], { hour12: false })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {e.ip} · {e.origin}
                      </p>
                    </li>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem>Blacklist IP</ContextMenuItem>
                    <ContextMenuItem>Trace Origin</ContextMenuItem>
                    <ContextMenuItem>Flag for Review</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </ul>
          </div>
          <Button onClick={handleGenerateReport} variant="outline" className="w-full text-xs">GENERATE AUDIT REPORT</Button>
        </div>
      </section>

      {selectedNode && (
        <NodeDetailModal 
            node={selectedNode} 
            isOpen={!!selectedNode} 
            onClose={() => setSelectedNode(null)} 
        />
      )}

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="panel rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="label-hud">Multi-tenant domain perimeter</p>
            <OnboardDomainModal onAdd={addTenant} />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-2 font-normal">Domain</th>
                  <th className="pb-2 font-normal">Verification</th>
                  <th className="pb-2 font-normal">Telemetry key</th>
                  <th className="pb-2 font-normal text-right">Events 24h</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.domain} className="border-t border-border/60">
                    <td className="py-2.5">
                      <span className="text-foreground">{t.domain}</span>
                      <span
                        className={`ml-2 text-[10px] uppercase ${
                          t.status === "verified"
                            ? "text-success"
                            : t.status === "pending"
                              ? "text-warning"
                              : "text-destructive"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{t.method}</td>
                    <td className="py-2.5 text-muted-foreground">{t.key}</td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {t.events24h.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel rounded-lg p-4">
          <p className="label-hud">Ghost-node obfuscation mesh</p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Outbound lookups rotate egress; scanners resolve decoy fingerprints only.
          </p>
          <ul className="mt-3 space-y-2">
            {EGRESS_NODES.map((n, i) => (
              <li
                key={n.id}
                onClick={() => setEgressIndex(i)}
                className={`flex cursor-pointer items-center justify-between rounded border px-3 py-2 text-xs transition-colors ${
                  i === egressIndex ? "border-primary/60 bg-secondary" : "border-border/60 hover:bg-border/20"
                }`}
              >
                <span className="text-foreground">{n.id.toUpperCase()}</span>
                <span className="text-muted-foreground">{n.region}</span>
                <span className="text-muted-foreground">decoy {n.decoy}</span>
                <span className={i === egressIndex ? "text-primary" : "text-muted-foreground"}>
                  {n.latency}ms
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Interface layer online · verification, GeoIP ingestion and tenant isolation await backend activation
      </p>
    </main>
  );
}
