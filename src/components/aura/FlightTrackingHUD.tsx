import { useTelemetryStore } from "@/store/telemetryStore";

export function FlightTrackingHUD() {
  const events = useTelemetryStore((state) => state.events);
  const flights = events.filter((e) => e.kind?.startsWith("Flight:"));

  return (
    <div className="absolute top-16 left-4 z-40 flex flex-col gap-2 pointer-events-none">
      {flights.map((flight) => (
        <div
          key={flight.id}
          className="bg-black/80 border border-blue-500/50 p-3 text-blue-400 font-mono text-xs rounded shadow-lg"
        >
          <div className="font-bold text-white border-b border-blue-500/30 mb-1 pb-1">
            {flight.kind}
          </div>
          <div>ALT: {(Math.random() * 30000 + 5000).toFixed(0)} ft</div>
          <div>SPD: {(Math.random() * 200 + 300).toFixed(0)} kts</div>
          <div>STATUS: ENROUTE</div>
        </div>
      ))}
    </div>
  );
}
