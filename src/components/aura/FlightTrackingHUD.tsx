import { useTelemetryStore } from "@/store/telemetryStore";

export function FlightTrackingHUD() {
  const events = useTelemetryStore((state) => state.events);
  const flights = events.filter((e) => e.kind?.startsWith("Flight:"));

  if (!flights.length) return null;

  return (
    <div className="absolute left-4 top-16 z-40 flex max-w-xs flex-col gap-2 pointer-events-none">
      {flights.slice(0, 8).map((flight) => (
        <div
          key={flight.id}
          className="rounded border border-primary/30 bg-black/80 p-3 font-mono text-xs text-primary shadow-lg"
        >
          <div className="mb-1 border-b border-primary/20 pb-1 font-bold text-foreground">
            {flight.kind}
          </div>
          <div>ORIGIN: {flight.origin || "unknown"}</div>
          <div>IP: {flight.ip || "unknown"}</div>
          <div>SCORE: {flight.score.toFixed(0)}</div>
          {typeof flight.lat === "number" && typeof flight.lon === "number" && (
            <div>
              POS: {flight.lat.toFixed(4)}, {flight.lon.toFixed(4)}
            </div>
          )}
          <div>AT: {new Date(flight.at).toISOString()}</div>
        </div>
      ))}
    </div>
  );
}
