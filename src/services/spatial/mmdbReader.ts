import { globalEvents, EVENTS } from "@/lib/events";

// GeoLite2 MMDB reader
export const MMDBReader = {
  async resolve(ip: string) {
    // Simulate reading binary and returning geoip bounds
    const coords: [number, number] = [(Math.random() - 0.5) * 360, (Math.random() - 0.5) * 180];

    console.log(`[MMDB] Resolved IP ${ip} to coords:`, coords);

    // Emit custom spatial fly-to event to trigger camera transition
    globalEvents.emit(EVENTS.MAP_FLY_TO, { center: coords, zoom: 14 });

    return { country: "Unknown", asn: Math.floor(Math.random() * 10000), coords };
  },
};
