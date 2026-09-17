import { create } from 'zustand';

interface MapState {
  flyToTarget: [number, number] | null;
  triggerFlyTo: (coords: [number, number]) => void;
  streamTarget: any | null;
  setStreamTarget: (target: any | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  flyToTarget: null,
  triggerFlyTo: (coords) => set({ flyToTarget: coords }),
  streamTarget: null,
  setStreamTarget: (target) => set({ streamTarget: target }),
}));
