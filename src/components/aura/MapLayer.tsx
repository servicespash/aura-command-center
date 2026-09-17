import { Suspense, lazy, useEffect, useState } from "react";
import { useTelemetryStore } from "@/store/telemetryStore";

const MapLibreCanvas = lazy(() => import("./MapLibreCanvas").then(m => ({ default: m.MapLibreCanvas })));
const OsirisGlobe = lazy(() => import('./OsirisGlobe').then(m => ({ default: m.OsirisGlobe })));

export function MapLayer() {
  const { mapZoom, mapViewMode } = useTelemetryStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div 
      className="absolute inset-0 z-0 pointer-events-auto overflow-hidden" 
      style={{ isolation: 'isolate', backgroundColor: 'var(--color-background)' }}
    >
      {/* Globe Layer */}
      <div 
        className="w-full h-full bg-slate-950 pointer-events-auto"
        style={{ display: mapViewMode === 'globe' ? 'block' : 'none' }}
      >
        <Suspense fallback={null}>
          <OsirisGlobe zoom={mapZoom} />
        </Suspense>
      </div>

      {/* Map Layer */}
      <div 
        className="w-full h-full pointer-events-auto"
        style={{ display: mapViewMode === 'map' ? 'block' : 'none' }}
      >
        <Suspense fallback={null}>
          <MapLibreCanvas zoom={mapZoom * 3} />
        </Suspense>
      </div>
    </div>
  );
}
