import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE_URL =
  import.meta.env["VITE_MAP_STYLE_URL"] || "https://tiles.openfreemap.org/styles/liberty";

export const SpatialEngine = {
  initializeMap(container: string | HTMLElement) {
    return new maplibregl.Map({
      container,
      style: STYLE_URL,
      center: [0, 20],
      zoom: 1.4,
      attributionControl: false,
      dragRotate: true,
      touchPitch: true,
      maxPitch: 85,
    });
  },

  flyTo(map: maplibregl.Map, center: [number, number], zoom = 7) {
    map.flyTo({
      center,
      zoom,
      speed: 0.8,
      curve: 1.4,
      essential: true,
    });
  },

  async resolveGeoIP(ip: string): Promise<[number, number]> {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip.trim())}/latlong/`);
    if (!response.ok) throw new Error(`GeoIP provider returned HTTP ${response.status}`);
    const parts = (await response.text()).trim().split(",");
    const latText = parts[0];
    const lonText = parts[1];
    if (latText === undefined || lonText === undefined) {
      throw new Error("GeoIP provider returned incomplete coordinates");
    }
    const lat = Number(latText);
    const lon = Number(lonText);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("GeoIP provider returned invalid coordinates");
    }
    return [lon, lat];
  },
};
