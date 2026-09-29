import { useState } from "react";
import { useTelemetryStore } from "@/store/telemetryStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FlightFeedModule() {
  const [filter, setFilter] = useState("");
  const events = useTelemetryStore((state) => state.events);
  const flights = events.filter(e => e.kind?.includes("Flight:"));

  return (
    <div className="flex h-full">
      <div className="w-32 border-r border-border p-2 space-y-2">
        <Label className="text-xs">Airline Filter</Label>
        <Input placeholder="Search..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {flights.filter(f => f.kind?.includes(filter)).map(f => (
          <div key={f.id} className="text-xs p-2 bg-secondary rounded truncate">{f.kind}</div>
        ))}
      </div>
    </div>
  );
}
