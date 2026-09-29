import { useTelemetryStore } from "@/store/telemetryStore";
import type { ThreatEvent } from "@/components/aura/data";

export function ingestVerifiedEvent(event: ThreatEvent) {
  if (!event.id || !event.nodeId || !event.ip || !Number.isFinite(event.score)) {
    throw new Error("Rejected malformed telemetry event");
  }
  useTelemetryStore.getState().addEvent({ ...event, at: new Date(event.at) });
}