import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ThreatEvent, Tenant, GeoNode } from "@/components/aura/data";
import { StorageService } from "@/lib/StorageService";

interface TelemetryState {
  events: ThreatEvent[];
  tenants: Tenant[];
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

  // Actions
  addEvent: (event: ThreatEvent) => void;
  setEvents: (events: ThreatEvent[]) => void;
  addTenant: (tenant: Tenant) => void;
  setTenants: (tenants: Tenant[]) => void;
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

// Custom IDB storage for zustand
const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await StorageService.zustandGet(name);
    return value ? JSON.stringify(value) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await StorageService.zustandSet(name, JSON.parse(value));
  },
  removeItem: async (name: string): Promise<void> => {
    await StorageService.zustandDel(name);
  },
};

export const useTelemetryStore = create<TelemetryState>()(
  persist(
    (set, get) => ({
      events: [],
      tenants: [],
      activeNodes: 0,
      egressIndex: 0,
      installedPackages: [],
      theme: "default",
      audioEnabled: true,
      focusedTarget: null,
      mapZoom: 1,
      mapCenter: [0, 0],
      mapViewMode: "globe",
      isFlightTrackingOpen: false,
      isTerminalOpen: true,

      addEvent: (event) => set((state) => ({ events: [event, ...state.events].slice(0, 100) })),

      setEvents: (events) => set({ events }),

      addTenant: (tenant) => set((state) => ({ tenants: [...state.tenants, tenant] })),

      setTenants: (tenants) => set({ tenants }),

      setActiveNodes: (countOrUpdater) =>
        set((state) => {
          const nextCount =
            typeof countOrUpdater === "function"
              ? countOrUpdater(state.activeNodes)
              : countOrUpdater;
          return { activeNodes: nextCount };
        }),

      setEgressIndex: (indexOrUpdater) =>
        set((state) => {
          const nextIndex =
            typeof indexOrUpdater === "function"
              ? indexOrUpdater(state.egressIndex)
              : indexOrUpdater;
          return { egressIndex: nextIndex };
        }),

      installPackage: (pkg) =>
        set((state) => {
          if (!state.installedPackages.includes(pkg)) {
            return { installedPackages: [...state.installedPackages, pkg] };
          }
          return state;
        }),

      setTheme: (theme) => set({ theme }),

      toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

      setFocusedTarget: (focusedTarget) => set({ focusedTarget }),

      setMapZoom: (mapZoom) => set({ mapZoom }),
      setMapCenter: (mapCenter) => set({ mapCenter }),
      setMapViewMode: (mapViewMode) => set({ mapViewMode }),
      toggleFlightTracking: () => set((state) => ({ isFlightTrackingOpen: !state.isFlightTrackingOpen })),
      toggleTerminal: () => set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),

      clearData: () => {
        set({ events: [], tenants: [], activeNodes: 0 });
      },

      archiveByDate: async (cutoff: Date) => {
        const { events } = get();
        // Since we restore from JSON, `e.at` might be a string. Handle it.
        const toArchive = events.filter((e) => new Date(e.at) < cutoff);
        const toKeep = events.filter((e) => new Date(e.at) >= cutoff);

        if (toArchive.length > 0) {
          await StorageService.archiveEvents(toArchive);
          set({ events: toKeep });
        }
      },
    }),
    {
      name: "aura-telemetry-storage",
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        events: state.events,
        tenants: state.tenants,
        installedPackages: state.installedPackages,
      }),
    },
  ),
);
