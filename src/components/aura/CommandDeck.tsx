import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Building2,
  ChevronRight,
  Crosshair,
  Minus,
  Plus,
  RotateCcw,
  TerminalSquare,
  Plane,
} from "lucide-react";
import { EGRESS_NODES, type Tenant } from "./data";
import { OnboardDomainModal } from "./OnboardDomainModal";
import { ScanlineOverlay } from "./ScanlineOverlay";
import { SystemDiagnosticsDrawer } from "./SystemDiagnosticsDrawer";
import { TerminalCommandPrompt } from "./TerminalCommandPrompt";
import { MapLayer } from "./MapLayer";
import { useKeyboardShortcut } from "@/hooks/use-keyboard";
import { Button } from "../ui/button";
import { useTelemetryStore } from "@/store/telemetryStore";
import { TelemetryEngine } from "@/lib/TelemetryEngine";
import { auditLayout } from "@/lib/LayoutAuditor";
import { ThreatPanel } from "./ThreatPanel";
import { TenantsPanel } from "./TenantsPanel";
import { FlightFeedModule } from "./FlightFeedModule";
import { LiveFlightFeed } from "./LiveFlightFeed";

type MobilePanel = "threats" | "tenants" | "terminal";

function Metric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="min-w-0 border-l border-border pl-3">
      <p className="label-hud truncate">{label}</p>
      <p
        className={`mt-1 font-display text-sm font-bold ${alert ? "text-destructive" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function ThreatPanel() {
  const events = useTelemetryStore((state) => state.events);
  const activeNodes = useTelemetryStore((state) => state.activeNodes);
  const egressIndex = useTelemetryStore((state) => state.egressIndex);
  const setEgressIndex = useTelemetryStore((state) => state.setEgressIndex);
  const egress = EGRESS_NODES[egressIndex] ?? EGRESS_NODES[0];
  const parsedEvents = useMemo(
    () => events.map((event) => ({ ...event, at: new Date(event.at) })),
    [events],
  );
  const critical = events.filter((event) => event.severity === "critical").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-2 border-b border-border p-3">
        <Metric label="Active nodes" value={String(activeNodes)} />
        <Metric label="Critical" value={String(critical)} alert={critical > 0} />
      </div>
      <section
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
        aria-label="Live threat ingestion"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="label-hud">Live threat ingestion</p>
          <span className="flex items-center gap-1 text-[9px] text-success">
            <Activity className="size-3" /> LIVE
          </span>
        </div>
        <ul className="space-y-2">
          {parsedEvents.slice(0, 40).map((event) => (
            <li
              key={event.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 border-b border-border/60 py-2 text-[10px]"
            >
              <span
                className={`mt-1 size-1.5 shrink-0 rounded-full ${event.severity === "critical" ? "bg-destructive" : event.severity === "elevated" ? "bg-warning" : "bg-success"}`}
              />
              <div className="min-w-0">
                <p className="truncate text-foreground">{event.kind}</p>
                <p className="truncate text-muted-foreground">
                  {event.ip} → {event.subdomain}
                </p>
              </div>
              <span className="tabular-nums text-muted-foreground">{event.score}</span>
            </li>
          ))}
          {parsedEvents.length === 0 && (
            <li className="py-8 text-center text-xs text-muted-foreground">Awaiting telemetry…</li>
          )}
        </ul>
      </section>
      {egress && (
        <section className="shrink-0 border-t border-border p-3" aria-label="Ghost egress">
          <div className="mb-2 flex items-center justify-between">
            <p className="label-hud">Ghost egress</p>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setEgressIndex((index) => (index + 1) % EGRESS_NODES.length)}
              aria-label="Cycle egress node"
              title="Cycle egress node"
            >
              <ChevronRight className="size-3" />
            </Button>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-[10px]">
            <div className="min-w-0">
              <p className="truncate text-primary">
                {egress.id} / {egress.city}
              </p>
              <p className="truncate text-muted-foreground">{egress.decoy}</p>
            </div>
            <div className="text-right">
              <p>{egress.latency}ms</p>
              <p className={egress.masked ? "text-success" : "text-warning"}>
                {egress.masked ? "MASKED" : "EXPOSED"}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function TenantsPanel() {
  const tenants = useTelemetryStore((state) => state.tenants);
  const addTenant = useTelemetryStore((state) => state.addTenant);
  const handleAdd = (domain: string, method: string, key: string) => {
    const tenant: Tenant = { domain, method, key, status: "verified", events24h: 0 };
    addTenant(tenant);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col p-3" aria-label="Tenant domains">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <p className="label-hud">Tenant domains</p>
        <OnboardDomainModal onAdd={handleAdd} />
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
        {tenants.map((tenant, index) => (
          <div
            key={`${tenant.domain}-${index}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/60 py-3 text-[10px]"
          >
            <div className="min-w-0">
              <p className="truncate text-foreground">{tenant.domain}</p>
              <p className="truncate text-muted-foreground">{tenant.method}</p>
            </div>
            <span className={tenant.status === "verified" ? "text-success" : "text-warning"}>
              {tenant.status?.toUpperCase() ?? "UNKNOWN"}
            </span>
          </div>
        ))}
        {tenants.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No tenant domains onboarded.
          </p>
        )}
      </div>
    </section>
  );
}

export function CommandDeck({ onLock }: { onLock: () => void }) {
  const activeNodes = useTelemetryStore((state) => state.activeNodes);
  const events = useTelemetryStore((state) => state.events);
  const mapZoom = useTelemetryStore((state) => state.mapZoom);
  const setMapZoom = useTelemetryStore((state) => state.setMapZoom);
  const mapViewMode = useTelemetryStore((state) => state.mapViewMode);
  const setMapViewMode = useTelemetryStore((state) => state.setMapViewMode);
  const toggleFlightTracking = useTelemetryStore((state) => state.toggleFlightTracking);
  const toggleTerminal = useTelemetryStore((state) => state.toggleTerminal);
  const [renderKey, setRenderKey] = useState(0);
  const [panelsMinimized, setPanelsMinimized] = useState(window.innerWidth < 768);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.getElementById("map-portal-root"));
    const handleResize = () => setPanelsMinimized(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Key Listeners
  useKeyboardShortcut("f", toggleFlightTracking);
  useKeyboardShortcut("t", toggleTerminal);
  useKeyboardShortcut("m", () => setMapViewMode(mapViewMode === "globe" ? "map" : "globe"));

  // Trigger re-render when switching to map mode
  useEffect(() => {
    if (mapViewMode === "map") {
      setRenderKey((prev) => prev + 1);
    }
  }, [mapViewMode]);

  // Audit DOM ancestors for the map viewport
  useEffect(() => {
    if (mapViewMode === "map") {
      const viewport = document.getElementById("map-viewport");
      if (viewport) {
        let parent = viewport.parentElement;
        console.log("[DOM Audit] Checking ancestors of map-viewport...");
        while (parent) {
          const style = window.getComputedStyle(parent);
          if (style.display === "none" || style.visibility === "hidden") {
            console.warn(`[DOM Audit] Found hidden ancestor:`, parent, style.display, style.visibility);
          }
          parent = parent.parentElement;
        }
      }
    }
  }, [mapViewMode]);

  // Telemetry simulation
  useEffect(() => {
    const engine = TelemetryEngine.getInstance();
    const interval = setInterval(() => {
      engine.ingestRealEvent({
        id: Math.random().toString(36).slice(2),
        at: new Date(),
        nodeId: "node-" + Math.floor(Math.random() * 100),
        origin: "127.0.0.1",
        ip: "192.168.1." + Math.floor(Math.random() * 255),
        kind: "Scan detected",
        subdomain: "app.secure.io",
        severity: Math.random() > 0.8 ? "critical" : Math.random() > 0.5 ? "elevated" : "clear",
        score: Math.floor(Math.random() * 100),
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const setEgressIndex = useTelemetryStore((state) => state.setEgressIndex);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("threats");
  const [desktopPanel, setDesktopPanel] = useState<Exclude<MobilePanel, "terminal">>("threats");
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const critical = events.filter((event) => event.severity === "critical").length;

  useEffect(() => {
    const engine = TelemetryEngine.getInstance();
    engine.start();
    return () => engine.stop();
  }, []);

  useKeyboardShortcut("d", () => setEgressIndex((index) => (index + 1) % EGRESS_NODES.length));
  useKeyboardShortcut("m", () => setMapViewMode("map"));
  useKeyboardShortcut("g", () => setMapViewMode("globe"));

  return (
    <main className="relative flex h-dvh w-screen flex-col overflow-hidden bg-transparent text-foreground">
      <LiveFlightFeed />
      <ScanlineOverlay />
      <header className="z-50 grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/95 px-3 backdrop-blur-md md:h-16 md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Crosshair className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-primary md:text-lg">AURA-NET</h1>
            <p className="label-hud hidden truncate sm:block">OSIRIS command viewport</p>
          </div>
          <div className="hidden items-center gap-5 lg:flex">
            <Metric label="Nodes" value={String(activeNodes)} />
            <Metric label="Critical" value={String(critical)} alert={critical > 0} />
          </div>
        </div>
        <nav className="flex shrink-0 items-center gap-1" aria-label="System controls">
          <Button variant="outline" size="sm" onClick={() => setPanelsMinimized(!panelsMinimized)}>
            {panelsMinimized ? "Expand" : "Minimize"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => setIsDiagnosticsOpen(true)}
          >
            Diagnostics
          </Button>
          <Button
            variant={mapViewMode === "globe" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMapViewMode("globe")}
          >
            Globe
          </Button>
          <Button
            variant={mapViewMode === "map" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMapViewMode("map")}
          >
            Map
          </Button>
          <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={onLock}>
            Lock
          </Button>
        </nav>
      </header>

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${panelsMinimized ? "" : "md:flex-row"}`}>
        <section
          id="map-viewport"
          className="relative min-h-0 flex-1 isolate touch-none bg-background"
          aria-label="Interactive global threat map"
        >
          {portalRoot && createPortal(<MapLayer key={renderKey} />, portalRoot)}
          <div className="pointer-events-auto absolute right-3 top-3 z-10 flex items-center gap-1 border border-border bg-card/90 p-1 backdrop-blur-md md:right-4 md:top-4">
            <span className="hidden border-r border-border px-2 text-[9px] uppercase text-muted-foreground sm:inline">
              {mapViewMode} projection
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setMapZoom(Math.min(mapZoom + 0.2, 3))}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setMapZoom(Math.max(mapZoom - 0.2, 0.5))}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <Minus />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setMapZoom(1)}
              aria-label="Reset zoom"
              title="Reset zoom"
            >
              <RotateCcw />
            </Button>
          </div>
        </section>

        {!panelsMinimized && (
          <aside className="hidden min-h-0 w-96 shrink-0 flex-col overflow-hidden border-l border-border bg-card/95 md:flex">
            <div className="grid h-10 shrink-0 grid-cols-3 border-b border-border p-1">
              <Button
                variant={desktopPanel === "threats" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDesktopPanel("threats")}
              >
                <Activity /> Threats
              </Button>
              <Button
                variant={desktopPanel === "tenants" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDesktopPanel("tenants")}
              >
                <Building2 /> Tenants
              </Button>
              <Button
                variant={desktopPanel === "flights" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDesktopPanel("flights")}
              >
                <Plane /> Flights
              </Button>
            </div>
            {desktopPanel === "threats" ? <ThreatPanel /> : desktopPanel === "tenants" ? <TenantsPanel /> : <FlightFeedModule />}
          </aside>
        )}
      </div>

      {!panelsMinimized && (
        <div className="hidden h-56 shrink-0 overflow-hidden border-t border-border bg-card/95 md:block">
          <TerminalCommandPrompt />
        </div>
      )}

      <section className="flex h-[42%] min-h-56 shrink-0 flex-col overflow-hidden border-t border-border bg-card/95 md:hidden">
        <div className="grid h-11 shrink-0 grid-cols-3 border-b border-border p-1">
          <Button
            variant={mobilePanel === "threats" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMobilePanel("threats")}
          >
            <Activity /> Threats
          </Button>
          <Button
            variant={mobilePanel === "tenants" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMobilePanel("tenants")}
          >
            <Building2 /> Tenants
          </Button>
          <Button
            variant={mobilePanel === "terminal" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMobilePanel("terminal")}
          >
            <TerminalSquare /> Terminal
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {mobilePanel === "threats" ? (
            <ThreatPanel />
          ) : mobilePanel === "tenants" ? (
            <TenantsPanel />
          ) : (
            <TerminalCommandPrompt />
          )}
        </div>
      </section>

      <SystemDiagnosticsDrawer
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />
    </main>
  );
}
