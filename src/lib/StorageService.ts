import { get, set, del } from "idb-keyval";
import { ThreatEvent, Tenant } from "@/components/aura/data";

/**
 * StorageService encapsulates an asynchronous IndexedDB layer using idb-keyval.
 * It provides a scalable append-only ledger for telemetry events and tenant data,
 * replacing synchronous localStorage to prevent UI blocking under heavy load.
 */
export const StorageService = {
  // Archive Events (Append to historical log)
  async archiveEvents(events: ThreatEvent[]): Promise<void> {
    const existing = (await get<ThreatEvent[]>("aura_events_archive")) || [];
    const merged = [...existing, ...events];
    await set("aura_events_archive", merged);
  },

  // Get Archived Events
  async getArchivedEvents(): Promise<ThreatEvent[]> {
    return (await get<ThreatEvent[]>("aura_events_archive")) || [];
  },

  // Purge specific log by ID from archive
  async deleteArchivedEvent(id: string): Promise<boolean> {
    const existing = (await get<ThreatEvent[]>("aura_events_archive")) || [];
    const filtered = existing.filter((e) => e.id !== id);
    if (existing.length !== filtered.length) {
      await set("aura_events_archive", filtered);
      return true;
    }
    return false;
  },

  // Clear all archives
  async clearArchive(): Promise<void> {
    await del("aura_events_archive");
  },

  // Store Zustand Persist State wrapper functions to potentially migrate zustand
  async zustandGet(key: string): Promise<unknown> {
    return await get(key);
  },

  async zustandSet(key: string, value: unknown): Promise<void> {
    await set(key, value);
  },

  async zustandDel(key: string): Promise<void> {
    await del(key);
  },
};
