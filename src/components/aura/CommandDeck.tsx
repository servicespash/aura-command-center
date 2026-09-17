import { useEffect, useState, useMemo } from "react";
import {
  EGRESS_NODES,
} from "./data";
import { OnboardDomainModal } from "./OnboardDomainModal";
import { ToggleSwitch } from "./ToggleSwitch";
import { ScanlineOverlay } from "./ScanlineOverlay";
import { FloatingHUD } from "./FloatingHUD";
import { SystemDiagnosticsDrawer } from "./SystemDiagnosticsDrawer";
import { AtmosphereLayer } from "./AtmosphereLayer";
import { GlobalCrtOverlay } from "./GlobalCrtOverlay";
import { TacticalZoomController } from "./TacticalZoomController";
import { TerminalCommandPrompt } from "./TerminalCommandPrompt";
import { MapLayer } from "./MapLayer";
import { useKeyboardShortcut } from "@/hooks/use-keyboard";
import { Button } from "../ui/button";
import { useTelemetryStore } from "@/store/telemetryStore";
import { TelemetryEngine } from "@/lib/TelemetryEngine";
import { StreamHUD } from "@/components/layout/StreamHUD";

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/20 rounded-lg px-4 py-3">
      <p className="label-hud">{label}</p>
      <p className={`mt-1.5 font-display text-xl font-bold ${tone ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

export function CommandDeck({ onLock }: { onLock: () => void }) {
  const {
    events,
    tenants,
    activeNodes,
    egressIndex,
    setEgressIndex,
    addTenant,
    mapZoom,
    setMapZoom,
    mapViewMode,
    setMapViewMode,
  } = useTelemetryStore();
  
  const [isClient, setIsClient] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const parsedEvents = useMemo(() => events.map((e) => ({ ...e, at: new Date(e.at) })), [events]);

  useEffect(() => {
    const engine = TelemetryEngine.getInstance();
    engine.start();
    return () => engine.stop();
  }, []);

  useKeyboardShortcut("d", () => setEgressIndex((i) => (i + 1) % EGRESS_NODES.length));

  const critical = events.filter((e) => e.severity === "critical").length;
  const egress = EGRESS_NODES[egressIndex] || EGRESS_NODES[0];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950">
        <GlobalCrtOverlay className="pointer-events-none" />
        <AtmosphereLayer className="pointer-events-none" />
        <ScanlineOverlay className="pointer-events-none" />

        {/* Header Bar */}
        <header className="h-16 flex items-center justify-between px-4 bg-slate-900/60 backdrop-blur-md border-b border-cyan-500/20">
            <div>
              <p className="label-hud">AURA-NET Command Center</p>
              <h1 className="text-glow mt-1 text-lg font-bold text-primary">AURA-NET</h1>
            </div>
            <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setIsDiagnosticsOpen(true)}
            >
                DIAGNOSTICS
            </Button>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
             {/* Primary Viewport */}
             <div id="map-viewport" className="flex-1 relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 z-0">
                  <MapLayer />
                </div>
                
                {/* Map Controls - Absolute to Viewport */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-900/60 backdrop-blur-md border border-cyan-500/20 p-2 rounded-lg pointer-events-auto">
                    <ToggleSwitch
                        labelLeft="Globe"
                        labelRight="Map"
                        onChange={(v) => setMapViewMode(v === "left" ? "globe" : "map")}
                    />
                    <TacticalZoomController
                        onZoomIn={() => setMapZoom((z) => Math.min(z + 0.2, 3))}
                        onZoomOut={() => setMapZoom((z) => Math.max(z - 0.2, 0.5))}
                        onReset={() => setMapZoom(1)}
                        onToggleMode={() => setMapViewMode((m) => (m === "globe" ? "map" : "globe"))}
                        mode={mapViewMode}
                    />
                </div>
             </div>

             {/* Side Data Panel */}
             <aside className="w-96 flex flex-col overflow-y-auto bg-slate-900/40 backdrop-blur-sm border-l border-white/10">
                <section className="p-4 grid grid-cols-2 gap-2">
                    <Stat label="Nodes" value={String(activeNodes)} />
                    <Stat label="Events" value={String(critical * 7 + 3)} />
                </section>
                <div className="p-4 border-t border-white/5">
                    <p className="label-hud mb-2">LIVE THREATS</p>
                    <ul className="space-y-2">
                        {parsedEvents.slice(0, 10).map((e) => (
                          <li key={e.id} className="border border-white/5 p-2 rounded text-[10px]">
                              {e.ip} - {e.kind}
                          </li>
                        ))}
                    </ul>
                </div>
                <div className="p-4 border-t border-white/5">
                    <p className="label-hud mb-2">TENANTS</p>
                    <OnboardDomainModal onAdd={addTenant} />
                </div>
             </aside>
        </div>

        {/* Docked Terminal */}
        <div className="h-64 border-t border-white/10 bg-slate-900/80 backdrop-blur-md">
            <TerminalCommandPrompt />
        </div>
        
        <SystemDiagnosticsDrawer isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />
        <FloatingHUD className="pointer-events-none" />
        <StreamHUD className="pointer-events-none" />
    </div>
  );
}
