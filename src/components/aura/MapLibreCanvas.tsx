/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { SeismicTelemetry } from "@/engine/osint/seismicTelemetry";
import { useMapStore } from "@/store/mapStore";
import { useTelemetryStore } from "@/store/telemetryStore";
import { ThreatHeatmap } from "./ThreatHeatmap";

type TelemetryFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  GeoJSON.GeoJsonProperties
>;

type Props = {
  zoom: number;
  viewMode: string;
};

export function MapLibreCanvas({ zoom, viewMode }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const setStreamTarget = useMapStore((state) => state.setStreamTarget);
  const cameraCommand = useMapStore((state) => state.cameraCommand);
  const clearCameraCommand = useMapStore((state) => state.clearCameraCommand);
  const setViewportBounds = useMapStore((state) => state.setViewportBounds);
  const events = useTelemetryStore((state) => state.events);

  useEffect(() => {
    if (viewMode !== "map" || !mapContainer.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.resize();
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "offline-tiles": {
            type: "vector",
            tiles: ["local://tiles/{z}/{x}/{y}.pbf"],
            maxzoom: 14,
          },
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: {
              "background-color": "rgba(2, 6, 23, 1)",
            },
          },
        ],
      },
      center: [32.5825, 0.3476],
      zoom: zoom,
      interactive: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;
    abortControllerRef.current = new AbortController();
    const currentSignal = abortControllerRef.current.signal;

    let disposed = false;
    let latestRequestId = 0;

    map.on("error", (event) => {
      if (disposed || mapInstanceRef.current !== map) return;
      console.error("[MapLibreCanvas] Map rendering error encountered:", event.error);
    });

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current === map) {
        map.resize();
      }
    });
    resizeObserver.observe(mapContainer.current);

    map.on("load", async () => {
      if (disposed || mapInstanceRef.current !== map || currentSignal.aborted) return;

      map.addSource("seismic-events", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: false,
      });

      map.addLayer({
        id: "seismic-points",
        type: "circle",
        source: "seismic-events",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 1.5, 5, 3, 10, 6],
          "circle-color": [
            "match",
            ["get", "type"],
            "seismic_alert",
            "#ef4444",
            "seismic_node",
            "#38bdf8",
            "#94a3b8",
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": 0,
        },
      });

      map.addSource("threat-intel", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "threat-points",
        type: "circle",
        source: "threat-intel",
        paint: {
          "circle-radius": 5,
          "circle-color": "#ef4444",
          "circle-opacity": 0.8,
        },
      });

      if (disposed || mapInstanceRef.current !== map) return;
      setIsMapLoaded(true);

      const updateSpatialIndex = async () => {
        if (disposed || mapInstanceRef.current !== map || currentSignal.aborted) return;

        const requestId = ++latestRequestId;
        const currentBounds = map.getBounds();

        setViewportBounds({
          west: currentBounds.getWest(),
          south: currentBounds.getSouth(),
          east: currentBounds.getEast(),
          north: currentBounds.getNorth(),
        });

        try {
          const filteredData = await SeismicTelemetry.queryViewport(
            currentBounds.getWest(),
            currentBounds.getSouth(),
            currentBounds.getEast(),
            currentBounds.getNorth(),
            currentSignal,
          );

          if (
            disposed ||
            currentSignal.aborted ||
            mapInstanceRef.current !== map ||
            requestId !== latestRequestId
          ) {
            return;
          }

          const source = map.getSource("seismic-events") as maplibregl.GeoJSONSource | undefined;
          if (source) {
            source.setData(filteredData as TelemetryFeatureCollection);
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name === "AbortError") return;
          console.error("[MapLibreCanvas] Viewport query update failed:", error);
        }
      };

      map.on("moveend", updateSpatialIndex);

      map.on("mouseenter", "seismic-points", () => {
        if (map.getCanvas()) map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "seismic-points", () => {
        if (map.getCanvas()) map.getCanvas().style.cursor = "";
      });

      map.on("click", "seismic-points", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        if (!feature || feature.geometry.type !== "Point") return;

        // Correctly extract ID from root GeoJSON feature or fallback to properties
        const properties = feature.properties as Record<string, unknown> | null;
        const rawId = feature["id"] ?? properties?.["id"];
        const entityId = rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
        if (!entityId) return;

        const coords = feature.geometry.coordinates as [number, number];
        const [lon, lat] = coords;

        if (
          typeof lon !== "number" ||
          typeof lat !== "number" ||
          !Number.isFinite(lon) ||
          !Number.isFinite(lat) ||
          lon < -180 ||
          lon > 180 ||
          lat < -90 ||
          lat > 90
        ) {
          return;
        }

        setStreamTarget({
          id: entityId,
          lat,
          lon,
        });
      });

      void updateSpatialIndex();
    });

    return () => {
      disposed = true;
      latestRequestId++;
      resizeObserver.disconnect();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (mapInstanceRef.current === map) {
        map.remove();
        mapInstanceRef.current = null;
      }
      setIsMapLoaded(false);
      setViewportBounds(null);
    };
  }, [viewMode, setViewportBounds, setStreamTarget]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded || !cameraCommand) return;

    map.flyTo({
      center: [...cameraCommand.coordinates],
      zoom: cameraCommand.zoom,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });

    clearCameraCommand(cameraCommand.id);
  }, [cameraCommand, clearCameraCommand, isMapLoaded]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (
      map &&
      isMapLoaded &&
      Number.isFinite(zoom) &&
      !cameraCommand &&
      Math.abs(map.getZoom() - zoom) > 0.01
    ) {
      map.easeTo({ zoom });
    }
  }, [zoom, isMapLoaded, cameraCommand]);

  return (
    <div ref={mapContainer} className="absolute inset-0 h-full w-full">
      <div className="absolute top-4 left-4 z-10 border-2 border-dashed border-red-500 bg-black/70 text-red-400 p-3 text-xs font-mono tracking-wider pointer-events-none">
        Map Initialized
      </div>
      {isMapLoaded && mapInstanceRef.current && (
        <ThreatHeatmap map={mapInstanceRef.current} events={events} />
      )}
    </div>
  );
}
