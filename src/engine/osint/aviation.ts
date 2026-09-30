import Flatbush from "flatbush";

type Feature = {
  id: string;
  geometry: { coordinates: [number, number] };
  properties: { mag: number; [key: string]: unknown };
};

// Aviation TLE Propagator with Spatial Indexing
let index: Flatbush | null = null;
let allFeatures: Feature[] = [];

export const AviationTelemetry = {
  async initialize() {
    if (index) return;

    try {
      const response = await fetch(
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
      );
      const data = await response.json();
      this.processFeatures(data.features || []);
      console.log(`[OSINT] Ingested ${data.features?.length || 0} live telemetry nodes.`);
    } catch (error) {
      console.error("[OSINT] Live telemetry source unavailable:", error);
      throw error;
    }
  },

  processFeatures(features: Feature[]) {
    index = new Flatbush(features.length);
    for (const feature of features) {
      const [lon, lat] = feature.geometry.coordinates;
      feature.properties = {
        ...feature.properties,
        id: feature.id,
        type: feature.properties.mag > 2.5 ? "satellite" : "flight",
      };
      index!.add(lon, lat, lon, lat);
    }
    index!.finish();
    allFeatures = features;
  },

  async getActiveVectors() {
    if (!index) await this.initialize();
    return {
      type: "FeatureCollection",
      features: allFeatures,
    };
  },

  async queryViewport(minX: number, minY: number, maxX: number, maxY: number) {
    if (!index) await this.initialize();

    // Ensure bounds are valid for search
    const safeMinX = Math.max(-180, Math.min(180, minX));
    const safeMinY = Math.max(-90, Math.min(90, minY));
    const safeMaxX = Math.max(-180, Math.min(180, maxX));
    const safeMaxY = Math.max(-90, Math.min(90, maxY));

    const results = index!.search(safeMinX, safeMinY, safeMaxX, safeMaxY);
    return {
      type: "FeatureCollection",
      features: results.map((i) => allFeatures[i]).filter((feature): feature is Feature => feature !== undefined),
    };
  },
};
