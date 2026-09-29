import { create } from "zustand";

interface MapState {
  flyToTarget: [number, number] | null;
  triggerFlyTo: (coords: [number, number]) => void;
  streamTarget: unknown | null;
  setStreamTarget: (target: unknown | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  flyToTarget: null,
  triggerFlyTo: (coords) => set({ flyToTarget: coords }),
  streamTarget: null,
  setStreamTarget: (target) => set({ streamTarget: target }),
}));
