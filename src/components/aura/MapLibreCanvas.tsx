import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AviationTelemetry } from "@/engine/osint/aviation";
import { useMapStore } from "@/store/mapStore";
import { useTelemetryStore } from "@/store/telemetryStore";
import { globalEvents, EVENTS } from "@/lib/events";
import { ThreatHeatmap } from "./ThreatHeatmap";

type Props = {
  zoom: number;
  viewMode: string;
};

export function MapLibreCanvas({ zoom, viewMode }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const { setStreamTarget } = useMapStore();
  const events = useTelemetryStore((state) => state.events);

  useLayoutEffect(() => {
    if (viewMode !== "map" || !mapContainer.current) return;

    if (map) {
      map.resize();
      return;
    }
    
    const mapInstance = new maplibregl.Map({
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
      center: [0, 20],
      zoom: zoom,
      interactive: true,
      attributionControl: false,
    });

    mapInstance.on("load", async () => {
      const bounds = mapInstance.getBounds();
      const initialData = await AviationTelemetry.queryViewport(
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      );

      mapInstance.addSource("aviation-telemetry", {
        type: "geojson",
        data: initialData as GeoJSON.FeatureCollection,
        cluster: false,
      });

      mapInstance.addLayer({
        id: "aviation-points",
        type: "circle",
        source: "aviation-telemetry",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 1.5, 5, 3, 10, 6],
          "circle-color": [
            "match",
            ["get", "type"],
            "satellite",
            "#ef4444",
            "#38bdf8",
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": 0,
        },
      });

      mapInstance.addSource("threat-intel", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      mapInstance.addLayer({
        id: "threat-points",
        type: "circle",
        source: "threat-intel",
        paint: {
          "circle-radius": 5,
          "circle-color": "#ef4444",
          "circle-opacity": 0.8,
        },
      });

      const updateSpatialIndex = async () => {
        const currentBounds = mapInstance.getBounds();
        const filteredData = await AviationTelemetry.queryViewport(
          currentBounds.getWest(),
          currentBounds.getSouth(),
          currentBounds.getEast(),
          currentBounds.getNorth(),
        );
        (mapInstance.getSource("aviation-telemetry") as maplibregl.GeoJSONSource).setData(
          filteredData as GeoJSON.FeatureCollection,
        );
      };

      mapInstance.on("moveend", updateSpatialIndex);
      mapInstance.on("zoomend", updateSpatialIndex);
      mapInstance.on("mouseenter", "aviation-points", () => (mapInstance.getCanvas().style.cursor = "pointer"));
      mapInstance.on("mouseleave", "aviation-points", () => (mapInstance.getCanvas().style.cursor = ""));
      mapInstance.on("click", "aviation-points", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const coords = (feature.geometry as GeoJSON.Point).coordinates;
        setStreamTarget({
          id: (feature.properties as Record<string, unknown> | null)?.["id"],
          lat: coords[1],
          lon: coords[0],
        });
      });

      setTimeout(() => mapInstance.resize(), 300);
      setMap(mapInstance);
    });

    return () => {
      mapInstance.remove();
      setMap(null);
    };
  }, [viewMode]);

  useEffect(() => {
    if (map && map.getSource("threat-intel")) {
      const geojson = {
        type: "FeatureCollection",
        features: events.map((e) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [e.lon || 0, e.lat || 0] },
          properties: { ...e },
        })),
      };
      (map.getSource("threat-intel") as maplibregl.GeoJSONSource).setData(
        geojson as GeoJSON.FeatureCollection,
      );
    }
  }, [events, map]);

  useEffect(() => {
    const handleFlyTo = (payload: { center: [number, number]; zoom: number }) => {
      if (map) {
        map.flyTo({ center: payload.center, zoom: payload.zoom || 6, speed: 1.2, curve: 1.4, essential: true });
      }
    };
    globalEvents.on(EVENTS.MAP_FLY_TO, handleFlyTo);
    return () => { globalEvents.off(EVENTS.MAP_FLY_TO, handleFlyTo) };
  }, [map]);

  useEffect(() => {
    if (map) map.easeTo({ zoom });
  }, [zoom, map]);

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0 h-full w-full"
    >
      <div className="absolute top-4 left-4 z-10 border-2 border-dashed border-red-500 bg-black/70 text-red-400 p-3 text-xs font-mono tracking-wider pointer-events-none">
        Map Initialized
      </div>
      {map && <ThreatHeatmap map={map} events={events} />}
    </div>
  );
}
