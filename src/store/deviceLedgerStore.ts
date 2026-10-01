import { create } from "zustand";

export type EnrolledDevice = {
  id: string;
  name: string;
  platform: string;
  ipAddress?: string;
  location?: { lat: number; lon: number; label?: string };
  enrolledAt: number;
  lastSeen: number;
  status: "online" | "offline";
};

type DeviceLedgerState = {
  devices: Record<string, EnrolledDevice>;
  enroll: (device: EnrolledDevice) => void;
  heartbeat: (
    deviceId: string,
    patch?: Partial<Pick<EnrolledDevice, "ipAddress" | "location">>,
  ) => void;
  revoke: (deviceId: string) => void;
  clear: () => void;
};

export const useDeviceLedgerStore = create<DeviceLedgerState>((set) => ({
  devices: {},
  enroll: (device) =>
    set((state) => ({ devices: { ...state.devices, [device.id]: device } })),
  heartbeat: (deviceId, patch) =>
    set((state) => {
      const device = state.devices[deviceId];
      if (!device) return state;
      return {
        devices: {
          ...state.devices,
          [deviceId]: {
            ...device,
            ...patch,
            lastSeen: Date.now(),
            status: "online",
          },
        },
      };
    }),
  revoke: (deviceId) =>
    set((state) => {
      const devices = { ...state.devices };
      delete devices[deviceId];
      return { devices };
    }),
  clear: () => set({ devices: {} }),
}));
