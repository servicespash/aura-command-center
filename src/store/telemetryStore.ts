import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { StorageService } from "@/lib/StorageService";
import type { EvidenceObservation } from "@/lib/EvidencePipeline";

interface TelemetryState {
  observations: EvidenceObservation[];
  events: any[];
  tenants: any[];
  activeNodes: number;
  egressIndex: number;
  installedPackages: string[];
  theme: "default" | "stealth" | "alert";
  audioEnabled: boolean;
  focusedTarget: { lat: number; lon: number } | null;
  mapZoom: number;
  mapCenter: [number, number];
  mapViewMode: "globe" | "map";
  isFlightTrackingOpen: boolean;
  isTerminalOpen: boolean;
  addObservation: (observation: EvidenceObservation) => void;
  addEvent: (event: any) => void;
  setEvents: (events: any[]) => void;
  addTenant: (tenant: any) => void;
  setTenants: (tenants: any[]) => void;
  setActiveNodes: (count: number | ((prev: number) => number)) => void;
  setEgressIndex: (index: number | ((prev: number) => number)) => void;
  installPackage: (pkg: string) => void;
  setTheme: (theme: "default" | "stealth" | "alert") => void;
  toggleAudio: () => void;
  setFocusedTarget: (target: { lat: number; lon: number } | null) => void;
  setMapZoom: (zoom: number) => void;
  setMapCenter: (center: [number, number]) => void;
  setMapViewMode: (mode: "globe" | "map") => void;
  toggleFlightTracking: () => void;
  toggleTerminal: () => void;
  clearData: () => void;
  archiveByDate: (cutoff: Date) => Promise<void>;
}
const idbStorage = {
  getItem: async (name: string) => { const value = await StorageService.zustandGet(name); return value ? JSON.stringify(value) : null; },
  setItem: async (name: string, value: string) => StorageService.zustandSet(name, JSON.parse(value)),
  removeItem: async (name: string) => StorageService.zustandDel(name),
};
export const useTelemetryStore = create<TelemetryState>()(persist((set, get) => ({
  observations: [], events: [], tenants: [], activeNodes: 0, egressIndex: 0, installedPackages: [],
  theme: "default", audioEnabled: true, focusedTarget: null, mapZoom: 1, mapCenter: [0,0],
  mapViewMode: "globe", isFlightTrackingOpen: false, isTerminalOpen: true,
  addObservation: (observation) => set(s => ({ observations: [observation, ...s.observations].slice(0, 500) })),
  addEvent: (event) => set(s => ({ events: [event, ...s.events].slice(0, 100) })),
  setEvents: (events) => set({ events }), addTenant: tenant => set(s => ({ tenants:[...s.tenants,tenant] })), setTenants: tenants => set({tenants}),
  setActiveNodes: v => set(s => ({ activeNodes: typeof v === "function" ? v(s.activeNodes) : v })),
  setEgressIndex: v => set(s => ({ egressIndex: typeof v === "function" ? v(s.egressIndex) : v })),
  installPackage: pkg => set(s => s.installedPackages.includes(pkg) ? s : ({installedPackages:[...s.installedPackages,pkg]})),
  setTheme: theme => set({theme}), toggleAudio:()=>set(s=>({audioEnabled:!s.audioEnabled})), setFocusedTarget:focusedTarget=>set({focusedTarget}),
  setMapZoom:mapZoom=>set({mapZoom}), setMapCenter:mapCenter=>set({mapCenter}), setMapViewMode:mapViewMode=>set({mapViewMode}),
  toggleFlightTracking:()=>set(s=>({isFlightTrackingOpen:!s.isFlightTrackingOpen})), toggleTerminal:()=>set(s=>({isTerminalOpen:!s.isTerminalOpen})),
  clearData:()=>set({events:[],observations:[],tenants:[],activeNodes:0}),
  archiveByDate: async cutoff => { const events=get().events; const old=events.filter(e=>new Date(e.at)<cutoff); if(old.length){await StorageService.archiveEvents(old);set({events:events.filter(e=>new Date(e.at)>=cutoff)});} },
}),{name:"aura-telemetry-storage",storage:createJSONStorage(()=>idbStorage),partialize:s=>({observations:s.observations,events:s.events,tenants:s.tenants,installedPackages:s.installedPackages})}));