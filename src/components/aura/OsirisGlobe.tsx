import { useEffect, useRef, useState, useMemo } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { useTelemetryStore } from "@/store/telemetryStore";
import { ThreatEvent, EGRESS_NODES } from "@/components/aura/data";

type ArcData = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
};

export function OsirisGlobe({ zoom }: { zoom: number }) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const events = useTelemetryStore((state) => state.events);
  const focusedTarget = useTelemetryStore((state) => state.focusedTarget);

  const [arcsData, setArcsData] = useState<ArcData[]>([]);
  const pointsData = useMemo(
    () =>
      events.map((e) => ({
        lat: e.lat || 0,
        lng: e.lon || 0,
        color: "#ef4444",
      })),
    [events],
  );

  // Convert real events into orthodromic arcs
  useEffect(() => {
    // Generate arcs from real events
    const arcs = events
      .filter(
        (ev) =>
          ev.lat !== undefined &&
          ev.lon !== undefined &&
          ev.destLat !== undefined &&
          ev.destLon !== undefined,
      )
      .map((ev) => ({
        startLat: ev.lat as number,
        startLng: ev.lon as number,
        endLat: ev.destLat as number,
        endLng: ev.destLon as number,
        color:
          ev.severity === "critical"
            ? "#ef4444"
            : ev.severity === "elevated"
              ? "#f59e0b"
              : "#3b82f6",
      }));
    setArcsData(arcs);
  }, [events]);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      globeRef.current.controls().enableZoom = false; // Zoom is handled via CLI or TacticalZoomController

      // Update camera distance based on zoom level
      // WebGL globe camera radius: closer to 1 is closer to surface
      const altitude = Math.max(0.1, 3.0 / zoom);
      globeRef.current.pointOfView({ altitude }, 1000);
    }
  }, [zoom]);

  useEffect(() => {
    if (focusedTarget && globeRef.current) {
      globeRef.current.pointOfView(
        {
          lat: focusedTarget.lat,
          lng: focusedTarget.lon,
          altitude: 0.2,
        },
        1500,
      );
      globeRef.current.controls().autoRotate = false;
    }
  }, [focusedTarget]);

  return (
    <div className="absolute inset-0 z-0 h-full w-full bg-slate-950">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere={true}
        atmosphereColor="#3b82f6"
        atmosphereAltitude={0.15}
        pointsData={pointsData}
        pointColor="color"
        pointAltitude={0.01}
        pointRadius={0.2}
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcAltitudeAutoScale={0.3}
        arcLabel={(arc) => {
          const a = arc as ArcData;
          return `Flight Path<br/>Speed: ${(Math.random() * 200 + 300).toFixed(0)} kts<br/>Alt: ${(Math.random() * 30000 + 5000).toFixed(0)} ft`;
        }}
        onArcClick={(arc) => {
          const a = arc as ArcData;
          if (globeRef.current) {
            globeRef.current.pointOfView({ lat: a.endLat, lng: a.endLng, altitude: 0.1 }, 1500);
          }
        }}
      />
    </div>
  );
}
