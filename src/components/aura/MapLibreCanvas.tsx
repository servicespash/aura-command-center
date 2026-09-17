import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AviationTelemetry } from "@/engine/osint/aviation";
import { useMapStore } from "@/store/mapStore";
import { useTelemetryStore } from "@/store/telemetryStore";
import { globalEvents, EVENTS } from "@/lib/events";

type Props = {
  zoom: number;
};

export function MapLibreCanvas({ zoom }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { setStreamTarget } = useMapStore();
  const events = useTelemetryStore((state) => state.events);

  useEffect(() => {
    if (mapRef.current && mapRef.current.getSource("threat-intel")) {
      const geojson = {
        type: "FeatureCollection",
        features: events.map(e => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [e.lon || 0, e.lat || 0] },
          properties: { ...e }
        }))
      };
      (mapRef.current.getSource("threat-intel") as maplibregl.GeoJSONSource).setData(geojson as any);
    }
  }, [events]);

  useEffect(() => {
    if (!mapContainer.current) return;

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
              "background-color": "rgba(2, 6, 23, 1)", // Dark theme background
            },
          },
        ],
      },
      center: [0, 20],
      zoom: zoom,
      interactive: true,
      attributionControl: false,
    });

    map.on("load", async () => {
      // Fetch initial subset within current bounds using flatbush indexing
      const bounds = map.getBounds();
      const initialData = await AviationTelemetry.queryViewport(
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
      );

      map.addSource("aviation-telemetry", {
        type: "geojson",
        data: initialData as any,
        cluster: false, // High density instanced rendering
      });

      // Custom webgl-optimized point buffer layer via standard circle layer
      map.addLayer({
        id: "aviation-points",
        type: "circle",
        source: "aviation-telemetry",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 1.5,
            5, 3,
            10, 6,
          ],
          "circle-color": [
            "match",
            ["get", "type"],
            "satellite", "#ef4444", // Destructive red
            "#38bdf8", // Primary blue
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


      // Handle spatial culling via Flatbush on viewport change
      const updateSpatialIndex = async () => {
        const currentBounds = map.getBounds();
        const filteredData = await AviationTelemetry.queryViewport(
          currentBounds.getWest(),
          currentBounds.getSouth(),
          currentBounds.getEast(),
          currentBounds.getNorth()
        );
        (map.getSource("aviation-telemetry") as maplibregl.GeoJSONSource).setData(filteredData as any);
      };

      map.on("moveend", updateSpatialIndex);
      map.on("zoomend", updateSpatialIndex);

      // Handle interactions for HUD stream deck
      map.on("mouseenter", "aviation-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      
      map.on("mouseleave", "aviation-points", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "aviation-points", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        if (!feature) return;
        const coords = (feature.geometry as any).coordinates;
        setStreamTarget({
          id: (feature.properties as any)?.['id'],
          lat: coords[1],
          lon: coords[0]
        });
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Handle fly-to custom event triggered by MMDBReader
  useEffect(() => {
    const handleFlyTo = (payload: { center: [number, number], zoom: number }) => {
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: payload.center,
          zoom: payload.zoom || 6,
          speed: 1.2,
          curve: 1.4,
          essential: true,
        });
      }
    };

    globalEvents.on(EVENTS.MAP_FLY_TO, handleFlyTo);

    return () => {
      globalEvents.off(EVENTS.MAP_FLY_TO, handleFlyTo);
    };
  }, []);

  // Handle zoom prop changes from TacticalZoomController
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.easeTo({ zoom });
    }
  }, [zoom]);

  return (
    <div 
      ref={mapContainer} 
      className="absolute inset-0 h-full w-full"
      style={{ background: 'transparent' }}
    />
  );
}
