import { Map as MapLibreMap } from "maplibre-gl";
import type { Position } from "../../domain/geo/coordinates";
import { assertPosition } from "../../domain/geo/coordinates";

export interface SpatialEngineConfig {
  container: string | HTMLElement;
  styleUrl: string;
  initialCenter?: Position;
  initialZoom?: number;
}

export interface FlyToOptions {
  center: Position;
  zoom?: number;
}

const DEFAULT_CENTER: Position = [32.5825, 0.3476];
const DEFAULT_ZOOM = 3;

const MIN_ZOOM = 0;
const MAX_ZOOM = 24;

function validateZoom(zoom: number): void {
  if (!Number.isFinite(zoom) || zoom < MIN_ZOOM || zoom > MAX_ZOOM) {
    throw new Error("[SpatialEngine] Invalid zoom level bounds");
  }
}

export const SpatialEngine = {
  initializeMap(config: SpatialEngineConfig): MapLibreMap {
    const center = config.initialCenter ?? DEFAULT_CENTER;
    const zoom = config.initialZoom ?? DEFAULT_ZOOM;

    assertPosition(center);
    validateZoom(zoom);

    if (!config.styleUrl || !config.styleUrl.trim()) {
      throw new Error("[SpatialEngine] Map style URL is required");
    }

    const map = new MapLibreMap({
      container: config.container,
      style: config.styleUrl,
      center: [...center],
      zoom,
      attributionControl: false,
      dragRotate: true,
      touchPitch: true,
      maxPitch: 85,
      touchZoomRotate: true,
      scrollZoom: true,
      boxZoom: true,
      dragPan: true,
      doubleClickZoom: true,
      keyboard: true,
    });

    return map;
  },

  flyTo(map: MapLibreMap, options: FlyToOptions): void {
    const { center, zoom = 7 } = options;

    assertPosition(center);
    validateZoom(zoom);

    map.flyTo({
      center: [...center],
      zoom,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });
  },

  destroy(map: MapLibreMap): void {
    map.remove();
  },
};
