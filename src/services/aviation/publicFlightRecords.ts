export type PublicFlightRecord = {
  icao24: string;
  callsign: string | null;
  originCountry: string | null;
  longitude: number;
  latitude: number;
  baroAltitudeM: number | null;
  velocityMps: number | null;
  headingDeg: number | null;
  verticalRateMps: number | null;
  onGround: boolean;
  lastContactUnix: number;
  source: "opensky";
};

const OPEN_SKY_STATES_URL = "https://opensky-network.org/api/states/all";

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function fetchPublicFlightRecords(bounds?: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}): Promise<PublicFlightRecord[]> {
  const url = new URL(OPEN_SKY_STATES_URL);
  if (bounds) {
    url.searchParams.set("lamin", String(bounds.lamin));
    url.searchParams.set("lomin", String(bounds.lomin));
    url.searchParams.set("lamax", String(bounds.lamax));
    url.searchParams.set("lomax", String(bounds.lomax));
  }

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Public flight source returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    time?: number;
    states?: unknown[][];
  };

  return (payload.states ?? [])
    .map((state): PublicFlightRecord | null => {
      const icao24 = typeof state[0] === "string" ? state[0].trim() : "";
      const latitude = finite(state[6]);
      const longitude = finite(state[5]);
      if (!icao24 || latitude === null || longitude === null) return null;

      return {
        icao24,
        callsign: typeof state[1] === "string" ? state[1].trim() || null : null,
        originCountry: typeof state[2] === "string" ? state[2] : null,
        longitude,
        latitude,
        baroAltitudeM: finite(state[7]),
        velocityMps: finite(state[9]),
        headingDeg: finite(state[10]),
        verticalRateMps: finite(state[11]),
        onGround: state[8] === true,
        lastContactUnix: typeof state[4] === "number" ? state[4] : payload.time ?? 0,
        source: "opensky",
      };
    })
    .filter((flight): flight is PublicFlightRecord => flight !== null);
}
