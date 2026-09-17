import { StorageService } from "@/lib/StorageService";
import { useTelemetryStore } from "@/store/telemetryStore";

export const PanicService = {
  async execute(): Promise<void> {
    // 1. Flush RAM state
    useTelemetryStore.getState().clearData();

    // 2. Overwrite IndexedDB with randomized bytes
    const junk = new Uint8Array(1024);
    crypto.getRandomValues(junk);
    await StorageService.zustandSet("aura-telemetry-storage", Array.from(junk));
    await StorageService.clearArchive();

    // 3. Force Decoy State
    window.location.href = "/decoy";
  },
};
