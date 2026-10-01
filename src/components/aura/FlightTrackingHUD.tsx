import { useEffect, useState } from "react";
import {
  fetchPublicFlightRecords,
  type PublicFlightRecord,
} from "@/services/aviation/publicFlightRecords";
import { useMapStore } from "@/store/mapStore";

export function FlightTrackingHUD() {
  const [flights, setFlights] = useState<PublicFlightRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const setStreamTarget = useMapStore((state) => state.setStreamTarget);
  const triggerFlyTo = useMapStore((state) => state.triggerFlyTo);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const records = await fetchPublicFlightRecords();
        if (active) {
          setFlights(records.slice(0, 12));
          setError(null);
        }
      } catch (cause) {
        if (active)
          setError(cause instanceof Error ? cause.message : "Public flight source unavailable");
      }
    };

    void refresh();
    const timer = setInterval(() => void refresh(), 15_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (error) {
    return (
      <div className="absolute left-4 top-16 z-40 max-w-xs rounded border border-destructive/30 bg-black/85 p-3 font-mono text-[10px] text-destructive shadow-lg">
        FLIGHT FEED OFFLINE · {error}
      </div>
    );
  }

  if (!flights.length) return null;

  return (
    <div className="absolute left-4 top-16 z-40 flex max-w-sm flex-col gap-2">
      {flights.map((flight) => (
        <button
          key={flight.icao24}
          type="button"
          className="pointer-events-auto rounded border border-primary/30 bg-black/85 p-3 text-left font-mono text-[10px] text-primary shadow-lg transition-colors hover:border-primary/70"
          onClick={() => {
            setStreamTarget({
              id: flight.callsign || flight.icao24,
              lat: flight.latitude,
              lon: flight.longitude,
            });
            triggerFlyTo([flight.longitude, flight.latitude]);
          }}
        >
          <div className="mb-1 flex items-center justify-between border-b border-primary/20 pb-1 font-bold text-foreground">
            <span>{flight.callsign || flight.icao24}</span>
            <span>{flight.onGround ? "GROUND" : "AIRBORNE"}</span>
          </div>
          <div>ICAO: {flight.icao24}</div>
          <div>ORIGIN: {flight.originCountry || "unknown"}</div>
          <div>
            POS: {flight.latitude.toFixed(4)}, {flight.longitude.toFixed(4)}
          </div>
          <div>
            ALT:{" "}
            {flight.baroAltitudeM === null ? "unknown" : `${Math.round(flight.baroAltitudeM)} m`}
          </div>
          <div>
            SPD:{" "}
            {flight.velocityMps === null
              ? "unknown"
              : `${Math.round(flight.velocityMps * 1.94384)} kt`}
          </div>
          <div>
            HDG: {flight.headingDeg === null ? "unknown" : `${Math.round(flight.headingDeg)}°`}
          </div>
          <div>SOURCE: PUBLIC ADS-B · OpenSky</div>
        </button>
      ))}
    </div>
  );
}
