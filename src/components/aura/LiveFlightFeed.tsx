import { useEffect } from "react";
import { useTelemetryStore } from "@/store/telemetryStore";

export function LiveFlightFeed() {
  const addEvent = useTelemetryStore((state) => state.addEvent);

  useEffect(() => {
    // Simulated Open-Source ADS-B Data Source
    const interval = setInterval(() => {
      addEvent({
        id: "fl-" + Math.random().toString(36).slice(2),
        at: new Date(),
        nodeId: "aircraft-" + Math.floor(Math.random() * 100),
        origin: "Unknown",
        ip: "0.0.0.0",
        kind: `Flight: ${["EK", "UA", "LH", "BA"][Math.floor(Math.random() * 4)]}${Math.floor(Math.random() * 900)}`,
        subdomain: "ads-b-feed",
        severity: "clear",
        score: 0,
        lat: (Math.random() * 180) - 90,
        lon: (Math.random() * 360) - 180,
        destLat: (Math.random() * 180) - 90,
        destLon: (Math.random() * 360) - 180,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [addEvent]);

  return null; // Logic-only module
}
