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
      className="absolute inset-0 z-0 isolate touch-none overflow-hidden bg-background pointer-events-auto" 
    >
      {/* Globe Layer */}
      <div 
        className="h-full w-full bg-background pointer-events-auto"
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
