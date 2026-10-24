export type Position = readonly [longitude: number, latitude: number];

export type GeoBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type GlobeViewMode = "globe" | "flat" | "tactical_grid";

export const MAP_LAYERS = [
  "continents",
  "countries",
  "admin_districts",
  "counties",
  "municipalities",
  "cities",
  "landforms",
  "h3_grid",
  "tactical_vectors",
] as const;

export type MapLayer = (typeof MAP_LAYERS)[number];

export function assertPosition(position: Position): void {
  const [lon, lat] = position;
  if (
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    lon < -180 ||
    lon > 180 ||
    lat < -90 ||
    lat > 90
  ) {
    throw new Error("Invalid geographic position");
  }
}

export function assertGeoBounds(bounds: GeoBounds): void {
  const { west, south, east, north } = bounds;
  if (
    !Number.isFinite(west) ||
    !Number.isFinite(south) ||
    !Number.isFinite(east) ||
    !Number.isFinite(north) ||
    west < -180 ||
    west > 180 ||
    east < -180 ||
    east > 180 ||
    south < -90 ||
    south > 90 ||
    north < -90 ||
    north > 90 ||
    south > north
  ) {
    throw new Error("Invalid geographic bounds");
  }
}
