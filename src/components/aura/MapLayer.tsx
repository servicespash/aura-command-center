import { Suspense, lazy, useEffect, useRef, useState, useLayoutEffect } from "react";
import { useTelemetryStore } from "@/store/telemetryStore";
import { TypingIndicator } from "./TypingIndicator";
import { auditLayout } from "@/lib/LayoutAuditor";
import { FlightTrackingHUD } from "./FlightTrackingHUD";
import { LayoutAuditOverlay } from "./LayoutAuditOverlay";

const MapLibreCanvas = lazy(() =>
  import("./MapLibreCanvas").then((m) => ({ default: m.MapLibreCanvas })),
);
const OsirisGlobe = lazy(() => import("./OsirisGlobe").then((m) => ({ default: m.OsirisGlobe })));

export function MapLayer() {
  const { mapZoom, mapViewMode } = useTelemetryStore();
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    // Simulate slight delay for transitions to trigger "typing" animation
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [mapViewMode]);

  useLayoutEffect(() => {
    if (mapViewMode === "map" && containerRef.current) {
      auditLayout(containerRef.current);

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            setIsInitialized(true);
          }
        }
      });
      resizeObserver.observe(containerRef.current);

      const rect = containerRef.current.getBoundingClientRect();
      setIsInitialized(rect.width > 0 && rect.height > 0);

      return () => resizeObserver.disconnect();
    }

    setIsInitialized(false);
    return undefined;
  }, [mapViewMode]);

  if (!isClient) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 isolate touch-none bg-background pointer-events-auto"
    >
      <LayoutAuditOverlay />
      {isLoading && <TypingIndicator word={mapViewMode === "map" ? "map" : "globe"} />}
      <FlightTrackingHUD />

      {/* Globe Layer */}
      <div
        className="absolute inset-0 h-full w-full bg-background transition-opacity duration-500 ease-in-out"
        style={{
          opacity: mapViewMode === "globe" ? 1 : 0,
          pointerEvents: mapViewMode === "globe" ? "auto" : "none",
          zIndex: 10,
        }}
      >
        <Suspense fallback={null}>
          <OsirisGlobe zoom={mapZoom} />
        </Suspense>
      </div>

      {/* Map Layer */}
      <div
        className="absolute inset-0 h-full w-full transition-opacity duration-500 ease-in-out"
        style={{
          opacity: mapViewMode === "map" ? 1 : 0,
          pointerEvents: mapViewMode === "map" ? "auto" : "none",
          zIndex: 20,
        }}
      >
        <Suspense fallback={null}>
          {isInitialized && <MapLibreCanvas zoom={mapZoom * 3} viewMode={mapViewMode} />}
        </Suspense>
      </div>
    </div>
  );
}
