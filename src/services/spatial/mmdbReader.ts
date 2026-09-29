import { globalEvents, EVENTS } from "@/lib/events";

export interface GeoIPResult {
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  region: string;
  timezone: string;
  asn: string | null;
  org: string | null;
  coords: [number, number];
  source: "ipapi.co";
}

/**
 * Resolves an IP through a live geolocation service.
 * IP geolocation is approximate and must never be treated as a street address.
 */
export const MMDBReader = {
  async resolve(ip: string): Promise<GeoIPResult> {
    const normalized = ip.trim();
    if (!normalized) throw new Error("IP address is required");

    const response = await fetch(`https://ipapi.co/${encodeURIComponent(normalized)}/json/`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`GeoIP provider returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      ip?: string;
      country_name?: string;
      country_code?: string;
      city?: string;
      region?: string;
      timezone?: string;
      asn?: string;
      org?: string;
      latitude?: number;
      longitude?: number;
      error?: boolean;
      reason?: string;
    };

    if (data.error || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
      throw new Error(data.reason || "GeoIP lookup failed");
    }

    const result: GeoIPResult = {
      ip: data.ip ?? normalized,
      country: data.country_name ?? "Unknown",
      countryCode: data.country_code ?? "XX",
      city: data.city ?? "Unknown",
      region: data.region ?? "Unknown",
      timezone: data.timezone ?? "UTC",
      asn: data.asn ?? null,
      org: data.org ?? null,
      coords: [data.longitude, data.latitude],
      source: "ipapi.co",
    };

    globalEvents.emit(EVENTS.MAP_FLY_TO, { center: result.coords, zoom: 7 });
    return result;
  },
};
