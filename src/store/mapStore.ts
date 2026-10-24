import { create } from "zustand";
import { MAP_LAYERS, assertPosition, assertGeoBounds } from "../domain/geo/coordinates";
import type { Position, GeoBounds, MapLayer, GlobeViewMode } from "../domain/geo/coordinates";

export type { Position, GeoBounds, MapLayer, GlobeViewMode };
export { MAP_LAYERS };

export type StreamTarget = {
  id: string;
  lat: number;
  lon: number;
  label?: string;
  updatedAt?: number;
};

export type EntitySelection = {
  id: string;
  type: MapLayer;
};

export type CameraCommand = {
  id: number;
  coordinates: Position;
  zoom: number;
};

export const DEFAULT_LAYERS: Record<MapLayer, boolean> = {
  continents: true,
  countries: true,
  admin_districts: false,
  counties: false,
  municipalities: false,
  cities: true,
  landforms: false,
  h3_grid: false,
  tactical_vectors: true,
};

const DEFAULT_ZOOM = 2;
const MIN_ZOOM = 0;
const MAX_ZOOM = 24;
const DEFAULT_H3_RESOLUTION = 4;

function assertZoom(zoom: number): void {
  if (!Number.isFinite(zoom) || zoom < MIN_ZOOM || zoom > MAX_ZOOM) {
    throw new Error("Invalid zoom level");
  }
}

function normalizeH3Resolution(res: number): number {
  if (!Number.isFinite(res) || !Number.isInteger(res) || res < 0 || res > 15) {
    throw new Error("H3 resolution must be an integer between 0 and 15");
  }
  return res;
}

interface MapState {
  cameraCommand: CameraCommand | null;
  nextCameraCommandId: number;
  zoomLevel: number;
  viewMode: GlobeViewMode;
  triggerFlyTo: (coordinates: Position, zoom?: number) => void;
  clearCameraCommand: (id: number) => void;
  setViewMode: (mode: GlobeViewMode) => void;
  setZoomLevel: (zoom: number) => void;
  streamTarget: StreamTarget | null;
  setStreamTarget: (target: StreamTarget | null) => void;
  activeLayers: Record<MapLayer, boolean>;
  toggleLayer: (layer: MapLayer) => void;
  setLayerState: (layer: MapLayer, enabled: boolean) => void;
  resetLayerPreferences: () => void;
  h3Resolution: number;
  setH3Resolution: (resolution: number) => void;
  selectedEntity: EntitySelection | null;
  setSelectedEntity: (entity: EntitySelection | null) => void;
  clearSelection: () => void;
  viewportBounds: GeoBounds | null;
  setViewportBounds: (bounds: GeoBounds | null) => void;
  resetNavigation: () => void;
  resetSession: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  cameraCommand: null,
  nextCameraCommandId: 1,
  zoomLevel: DEFAULT_ZOOM,
  viewMode: "globe",
  triggerFlyTo: (coordinates, zoom = 5) => {
    assertPosition(coordinates);
    assertZoom(zoom);
    set((state) => ({
      cameraCommand: {
        id: state.nextCameraCommandId,
        coordinates: [...coordinates] as Position,
        zoom,
      },
      nextCameraCommandId: state.nextCameraCommandId + 1,
      zoomLevel: zoom,
    }));
  },
  clearCameraCommand: (id) =>
    set((state) => (state.cameraCommand?.id === id ? { cameraCommand: null } : {})),
  setViewMode: (mode) => set({ viewMode: mode }),
  setZoomLevel: (zoom) => {
    assertZoom(zoom);
    set({ zoomLevel: zoom });
  },
  streamTarget: null,
  setStreamTarget: (target) => {
    if (target) {
      assertPosition([target.lon, target.lat]);
      if (!target.id.trim()) throw new Error("Stream target ID is required");
      if (
        target.updatedAt !== undefined &&
        (!Number.isFinite(target.updatedAt) || target.updatedAt < 0)
      ) {
        throw new Error("Invalid stream target timestamp");
      }
      set({
        streamTarget: {
          ...target,
          id: target.id.trim(),
        },
      });
      return;
    }
    set({ streamTarget: null });
  },
  activeLayers: { ...DEFAULT_LAYERS },
  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: { ...state.activeLayers, [layer]: !state.activeLayers[layer] },
    })),
  setLayerState: (layer, enabled) =>
    set((state) => ({
      activeLayers: { ...state.activeLayers, [layer]: enabled },
    })),
  resetLayerPreferences: () => set({ activeLayers: { ...DEFAULT_LAYERS } }),
  h3Resolution: DEFAULT_H3_RESOLUTION,
  setH3Resolution: (resolution) => set({ h3Resolution: normalizeH3Resolution(resolution) }),
  selectedEntity: null,
  setSelectedEntity: (entity) =>
    set({
      selectedEntity: entity ? { ...entity } : null,
    }),
  clearSelection: () => set({ selectedEntity: null }),
  viewportBounds: null,
  setViewportBounds: (bounds) => {
    if (bounds) assertGeoBounds(bounds);
    set({
      viewportBounds: bounds ? { ...bounds } : null,
    });
  },
  resetNavigation: () =>
    set({ cameraCommand: null, zoomLevel: DEFAULT_ZOOM, viewportBounds: null }),
  resetSession: () =>
    set({
      cameraCommand: null,
      zoomLevel: DEFAULT_ZOOM,
      viewMode: "globe",
      streamTarget: null,
      selectedEntity: null,
      viewportBounds: null,
      activeLayers: { ...DEFAULT_LAYERS },
      h3Resolution: DEFAULT_H3_RESOLUTION,
    }),
}));
