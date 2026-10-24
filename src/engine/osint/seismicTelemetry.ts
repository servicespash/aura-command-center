import Flatbush from "flatbush";

type SeismicProperties = {
  mag: number | null;
  place: string;
  type: "seismic_alert" | "seismic_node";
  time: number | null;
  url: string;
  title: string;
};

type Feature = GeoJSON.Feature<GeoJSON.Point, SeismicProperties> & {
  id: string;
};

type TelemetryStatus = "loading" | "ready" | "refreshing" | "stale" | "error";

let index: Flatbush | null = null;
let validFeatures: Feature[] = [];
let fetchPromise: Promise<void> | null = null;
let lastUpdated: number | null = null;
let lastAttemptAt: number | null = null;
let lastError: string | null = null;
let currentStatus: TelemetryStatus = "loading";

function isValidPosition(lon: unknown, lat: unknown): boolean {
  return (
    typeof lon === "number" &&
    typeof lat === "number" &&
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

function normalizeLongitude(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/**
 * Calculates Flatbush query ranges under a strict ordered-bounds contract (east >= west).
 * Gracefully handles world spans and explicit dateline splits without guessing.
 */
function getQueryRanges(west: number, east: number): Array<[number, number]> {
  if (!Number.isFinite(west) || !Number.isFinite(east)) {
    throw new Error("[OSINT] Invalid longitude interval");
  }
  if (east < west) {
    throw new Error("[OSINT] Expected ordered longitude bounds (east >= west)");
  }

  const span = east - west;

  if (span >= 360) {
    return [[-180, 180]];
  }

  const start = normalizeLongitude(west);
  const unwrappedEnd = start + span;

  if (unwrappedEnd <= 180) {
    return [[start, unwrappedEnd]];
  }

  return [
    [start, 180],
    [-180, unwrappedEnd - 360],
  ];
}

function normalizeEventUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "earthquake.usgs.gov" ||
      parsed.port !== "" ||
      parsed.username !== "" ||
      parsed.password !== ""
    ) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function cloneFeature(feature: Feature): Feature {
  return {
    ...feature,
    geometry: {
      type: "Point",
      coordinates: [...feature.geometry.coordinates],
    },
    properties: { ...feature.properties },
  };
}

function processFeatures(rawFeatures: unknown[]): { newIndex: Flatbush; newFeatures: Feature[] } {
  const filtered: Feature[] = [];
  const seenIds = new Set<string>();

  for (const raw of rawFeatures) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;

    const sourceId = typeof r["id"] === "string" && r["id"].trim() ? r["id"].trim() : null;
    if (!sourceId) continue;

    if (!r["geometry"] || typeof r["geometry"] !== "object") continue;
    const geom = r["geometry"] as Record<string, unknown>;
    if (geom["type"] !== "Point" || !Array.isArray(geom["coordinates"])) continue;

    const coords = geom["coordinates"];
    if (coords.length < 2) continue;

    const rawLon = coords[0];
    const lat = coords[1];

    if (typeof rawLon !== "number" || typeof lat !== "number") continue;

    // CRITICAL: Validate raw provider coordinates FIRST before canonicalization
    if (!isValidPosition(rawLon, lat)) continue;
    if (seenIds.has(sourceId)) continue;

    // Canonicalize valid longitude for seamless seam matching (+180/-180)
    const lon = normalizeLongitude(rawLon);

    const props = (
      r["properties"] && typeof r["properties"] === "object" ? r["properties"] : {}
    ) as Record<string, unknown>;
    const rawMag = props["mag"];
    const mag = typeof rawMag === "number" && Number.isFinite(rawMag) ? rawMag : null;
    const place = typeof props["place"] === "string" ? props["place"] : "Unknown location";
    const time =
      typeof props["time"] === "number" && Number.isFinite(props["time"]) ? props["time"] : null;
    const url = normalizeEventUrl(props["url"]);
    const title = typeof props["title"] === "string" ? props["title"] : "";

    seenIds.add(sourceId);

    const feature: Feature = {
      type: "Feature",
      id: sourceId,
      geometry: {
        type: "Point",
        coordinates: [lon, lat],
      },
      properties: {
        mag,
        place,
        time,
        url,
        title,
        type: mag !== null && mag > 2.5 ? "seismic_alert" : "seismic_node",
      },
    };
    filtered.push(feature);
  }

  const newIndex = new Flatbush(filtered.length);
  for (const feature of filtered) {
    const lonCoord = feature.geometry.coordinates[0];
    const latCoord = feature.geometry.coordinates[1];
    if (typeof lonCoord === "number" && typeof latCoord === "number") {
      newIndex.add(lonCoord, latCoord, lonCoord, latCoord);
    }
  }
  newIndex.finish();

  return { newIndex, newFeatures: filtered };
}

// Private module-scoped fetch executor
async function executeFetch(isRefresh: boolean): Promise<void> {
  if (fetchPromise) return fetchPromise;

  currentStatus = isRefresh && index ? "refreshing" : "loading";
  lastAttemptAt = Date.now();

  fetchPromise = (async () => {
    try {
      const response = await fetch(
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
      );
      if (!response.ok) {
        throw new Error(`USGS feed returned HTTP status ${response.status}`);
      }
      const data: unknown = await response.json();
      if (
        typeof data !== "object" ||
        data === null ||
        !("features" in data) ||
        !Array.isArray(data.features)
      ) {
        throw new Error("[OSINT] Invalid USGS GeoJSON response format");
      }

      const { newIndex, newFeatures } = processFeatures(data.features);
      index = newIndex;
      validFeatures = newFeatures;
      lastUpdated = Date.now();
      currentStatus = "ready";
      lastError = null;
      console.log(
        `[OSINT] Snapshot synchronized successfully. Active nodes: ${validFeatures.length}`,
      );
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (!index) {
        currentStatus = "error";
      } else {
        currentStatus = "stale";
      }
      console.warn(
        "[OSINT] Snapshot fetch failed (preserving last-known-good state if available):",
        error,
      );
      throw error;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Helper to race a task against an AbortSignal without destroying the underlying shared operation.
 */
async function withAbortSignal<T>(task: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return task;
  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  return new Promise<T>((resolve, reject) => {
    const abortHandler = () => {
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", abortHandler, { once: true });

    task.then(
      (res) => {
        signal.removeEventListener("abort", abortHandler);
        resolve(res);
      },
      (err) => {
        signal.removeEventListener("abort", abortHandler);
        reject(err);
      },
    );
  });
}

export const SeismicTelemetry = {
  async initialize(signal?: AbortSignal): Promise<void> {
    if (index) return;
    return withAbortSignal(executeFetch(false), signal);
  },

  async refresh(signal?: AbortSignal): Promise<void> {
    try {
      return await withAbortSignal(executeFetch(true), signal);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      console.warn("[OSINT] Background telemetry refresh failed gracefully:", error);
    }
  },

  async getActiveVectors(
    signal?: AbortSignal,
  ): Promise<GeoJSON.FeatureCollection<GeoJSON.Point, GeoJSON.GeoJsonProperties>> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (!index) await this.initialize(signal);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    return {
      type: "FeatureCollection",
      features: validFeatures.map(cloneFeature),
    };
  },

  getStatus() {
    return {
      status: currentStatus,
      lastUpdated,
      lastAttemptAt,
      lastError,
      nodeCount: validFeatures.length,
      ageMs: lastUpdated !== null ? Date.now() - lastUpdated : null,
    };
  },

  async queryViewport(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    signal?: AbortSignal,
  ) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
      throw new Error("[OSINT] Invalid viewport bounds: non-finite values");
    }

    if (minY > maxY) {
      throw new Error("[OSINT] Invalid viewport latitude bounds (minY > maxY)");
    }

    const safeMinY = Math.max(-90, Math.min(90, minY));
    const safeMaxY = Math.max(-90, Math.min(90, maxY));

    if (!index) await this.initialize(signal);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    if (!index || validFeatures.length === 0) {
      return { type: "FeatureCollection" as const, features: [] };
    }

    const ranges = getQueryRanges(minX, maxX);
    const matchedIndices = new Set<number>();

    for (const [rMinX, rMaxX] of ranges) {
      const results = index.search(rMinX, safeMinY, rMaxX, safeMaxY);
      for (const idx of results) {
        matchedIndices.add(idx);
      }
    }

    return {
      type: "FeatureCollection" as const,
      features: Array.from(matchedIndices)
        .map((i) => validFeatures[i])
        .filter((feature): feature is Feature => feature !== undefined)
        .map(cloneFeature),
    };
  },
};
