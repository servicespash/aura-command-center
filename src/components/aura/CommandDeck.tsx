import { useEffect, useState, useRef } from "react";
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
import { SystemDiagnosticsDrawer } from "./SystemDiagnosticsDrawer";
import { AtmosphereLayer } from "./AtmosphereLayer";
import { GlobalCrtOverlay } from "./GlobalCrtOverlay";
import { TacticalZoomController } from "./TacticalZoomController";
import { TerminalCommandPrompt } from "./TerminalCommandPrompt";
import { CacheManagerModal } from "./CacheManagerModal";
import { GeoSearch } from "./GeoSearch";
import { useKeyboardShortcut } from "@/hooks/use-keyboard";
import { generateSessionReport } from "@/lib/report-utils";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

function severityClass(s: ThreatEvent["severity"]) {
  return s === "critical" ? "text-destructive" : s === "elevated" ? "text-warning" : "text-primary";
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="panel rounded-lg px-4 py-3">
      <p className="label-hud">{label}</p>
      <p className={`mt-1.5 font-display text-xl font-bold ${tone ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

export function CommandDeck({ onLock }: { onLock: () => void }) {
  const [events, setEvents] = useState<ThreatEvent[]>(() => {
    const saved = localStorage.getItem("aura_events");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((e: { at: string | Date } & Record<string, unknown>) => ({
          ...e,
          at: new Date(e.at),
        }));
      } catch (e) {
        console.error(e);
      }
    }
    return Array.from({ length: 6 }, () => randomEvent(SEED_NODES));
  });
  const [egressIndex, setEgressIndex] = useState(0);
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem("aura_tenants");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return SEED_TENANTS;
  });
  const [viewMode, setViewMode] = useState<"globe" | "map">("globe");
  const [activeNodes, setActiveNodes] = useState(SEED_NODES.length * 214);

  const tenantsRef = useRef(tenants);
  tenantsRef.current = tenants;

  useEffect(() => {
    localStorage.setItem("aura_events", JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem("aura_tenants", JSON.stringify(tenants));
  }, [tenants]);

  const handleClearData = () => {
    setEvents([]);
    setTenants([]);
    setActiveNodes(0);
    localStorage.removeItem("aura_events");
    localStorage.removeItem("aura_tenants");
  };

  const handleArchiveByDate = (cutoff: Date) => {
    const toArchive = events.filter((e) => e.at < cutoff);
    const toKeep = events.filter((e) => e.at >= cutoff);

    if (toArchive.length > 0) {
      const savedArchive = localStorage.getItem("aura_events_archive");
      let currentArchive = [];
      try {
        if (savedArchive) currentArchive = JSON.parse(savedArchive);
      } catch (e) {
        console.error(e);
      }

      const newArchive = [...currentArchive, ...toArchive];
      localStorage.setItem("aura_events_archive", JSON.stringify(newArchive));
      setEvents(toKeep);
    }
  };

  const addTenant = (domain: string, method: string, key: string) => {
    setTenants((prev) => [
      ...prev,
      { domain, status: "verified", method: method as Tenant["method"], key, events24h: 0 },
    ]);
  };

  useKeyboardShortcut("d", () => setEgressIndex((i) => (i + 1) % EGRESS_NODES.length));
  useKeyboardShortcut("k", () => console.log("Search functionality not implemented"));

  const handleGenerateReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      tenants,
      events,
      activeNodes,
      egressIndex,
    };
    generateSessionReport(reportData);
  };

  useEffect(() => {
    let feedTimeout: number;
    let frameId: number;
    let time = 0;

    const animateGrid = () => {
      time += 0.01;
      const breath = Math.sin(time) * 10;
      document.documentElement.style.setProperty("--grid-breath", `${breath}px`);
      frameId = requestAnimationFrame(animateGrid);
    };
    frameId = requestAnimationFrame(animateGrid);

    const scheduleFeed = () => {
      const delay = 2000 + Math.random() * 3000;
      feedTimeout = window.setTimeout(() => {
        if (tenantsRef.current.length > 0) {
          const newEvent = randomEvent(SEED_NODES);
          setEvents((prev) => [newEvent, ...prev].slice(0, 14));
          if (newEvent.severity === "critical") {
            setActiveNodes((prev) => prev + Math.floor(Math.random() * 10));
          }
        }
        scheduleFeed();
      }, delay);
    };
    scheduleFeed();

    const rotate = window.setInterval(() => {
      setEgressIndex((i) => (i + 1) % EGRESS_NODES.length);
    }, 5000);

    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--grid-x", `${e.clientX / 10}px`);
      document.documentElement.style.setProperty("--grid-y", `${e.clientY / 10}px`);
    };
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.clearTimeout(feedTimeout);
      window.clearInterval(rotate);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  const [selectedNode, setSelectedNode] = useState<GeoNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  const critical = events.filter((e) => e.severity === "critical").length;
  const egress = EGRESS_NODES[egressIndex]!;

  // Mock AudioContext
  useEffect(() => {
    if (isAudioEnabled) {
      const audioCtx = new (
        window.AudioContext ||
        (window as unknown as Window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(60, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();
      return () => oscillator.stop();
    }
  }, [isAudioEnabled]);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 relative overflow-y-auto overflow-x-hidden scrollbar-none pb-12">
      <GlobalCrtOverlay />
      <AtmosphereLayer />
      <ScanlineOverlay />
      <FloatingHUD />
      <SystemDiagnosticsDrawer
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />
      <header className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div>
          <p className="label-hud">Artificial Unified Response &amp; Analytics Network</p>
          <h1 className="text-glow mt-1 text-xl font-bold text-primary sm:text-2xl">AURA-NET</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CacheManagerModal onClearData={handleClearData} onArchiveByDate={handleArchiveByDate} />
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setIsDiagnosticsOpen(true)}
          >
            DIAGNOSTICS
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
          >
            AUDIO: {isAudioEnabled ? "ON" : "OFF"}
          </Button>
          <ToggleSwitch
            labelLeft="Globe"
            labelRight="Map"
            onChange={(v) => setViewMode(v === "left" ? "globe" : "map")}
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

      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
        <Stat label="Active nodes" value={String(activeNodes)} tone="text-primary" />
        <Stat label="Critical events" value={String(critical * 7 + 3)} tone="text-destructive" />
        <Stat label="Tenant domains" value={String(tenants.length)} />
        <Stat label="Ghost egress" value={egress.id.toUpperCase()} tone="text-warning" />
      </section>

      <section className="mt-4 flex flex-col gap-4 lg:flex-row relative z-10">
        <div className="panel scanline min-w-0 flex-1 rounded-lg p-3 flex flex-col relative z-10 overflow-visible">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 mb-2 gap-3 z-20">
            <div>
              <p className="label-hud">Cinematic earth · geoip stream</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                live geoip stream · zero external latency
              </p>
            </div>
            <GeoSearch
              nodes={SEED_NODES}
              onSelect={(node) => {
                setSelectedNode(node);
                setViewMode("globe");
                setZoom(2.5); // triggers smooth zoom in GlobeCanvas spring
              }}
            />
          </div>
          <div className="mt-2 flex-1 min-h-[320px] sm:min-h-[420px] w-full relative z-0">
            <TacticalZoomController
              onZoomIn={() => setZoom((z) => Math.min(z + 0.2, 3))}
              onZoomOut={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
              onReset={() => setZoom(1)}
              onToggleMode={() => setViewMode((m) => (m === "globe" ? "map" : "globe"))}
              mode={viewMode}
            />
            <GlobeCanvas
              nodes={SEED_NODES}
              selectedId={selectedNode?.id}
              onSelect={setSelectedNode}
              mode={viewMode}
              zoom={zoom}
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-1/3 relative z-10">
          <div className="panel rounded-lg p-4 flex-1 overflow-hidden">
            <p className="label-hud">
              Live threat ingestion {tenants.length === 0 && "(PAUSED - NO DOMAINS)"}
            </p>
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
          <Button onClick={handleGenerateReport} variant="outline" className="w-full text-xs">
            GENERATE AUDIT REPORT
          </Button>
        </div>
      </section>

      {selectedNode && (
        <NodeDetailModal node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}

      <section className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
        <div className="panel rounded-lg p-4 overflow-hidden">
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

        <div className="panel rounded-lg p-4 overflow-hidden">
          <p className="label-hud">Ghost-node obfuscation mesh</p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Outbound lookups rotate egress; scanners resolve decoy fingerprints only.
          </p>
          <ul className="mt-3 space-y-2 overflow-y-auto max-h-[300px]">
            {EGRESS_NODES.map((n, i) => (
              <li
                key={n.id}
                onClick={() => setEgressIndex(i)}
                className={`flex cursor-pointer items-center justify-between rounded border px-3 py-2 text-xs transition-colors ${
                  i === egressIndex
                    ? "border-primary/60 bg-secondary"
                    : "border-border/60 hover:bg-border/20"
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
        <div className="panel rounded-lg p-4 overflow-hidden">
          <p className="label-hud">Terminal Access</p>
          <div className="mt-3">
            <TerminalCommandPrompt />
          </div>
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-muted-foreground relative z-10">
        Interface layer online · verification, GeoIP ingestion and tenant isolation await backend
        activation
      </p>
    </main>
  );
}
