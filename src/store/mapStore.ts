import { create } from "zustand";

export type StreamTarget = { id?: string; lat: number; lon: number };

interface MapState {
  flyToTarget: [number, number] | null;
  triggerFlyTo: (coords: [number, number]) => void;
  streamTarget: StreamTarget | null;
  setStreamTarget: (target: StreamTarget | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  flyToTarget: null,
  triggerFlyTo: (coords) => set({ flyToTarget: coords }),
  streamTarget: null,
  setStreamTarget: (target) => set({ streamTarget: target }),
}));
