import { z } from "zod";
import { useTelemetryStore } from "@/store/telemetryStore";
import { emitSpatialPulse } from "@/lib/events";

export const EvidenceObservationSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }),
  source: z.string().min(1),
  target: z.string().min(1),
  operation: z.string().min(1),
  result: z.unknown(),
  provenance: z.object({
    agent: z.string().min(1),
    transport: z.literal("aura-runtime-agent"),
    receivedAt: z.string().datetime({ offset: true }),
  }),
  score: z.number().min(0).max(100),
  location: z.object({
    lat: z.number().finite().min(-90).max(90),
    lon: z.number().finite().min(-180).max(180),
  }).optional(),
});

export type EvidenceObservation = z.infer<typeof EvidenceObservationSchema>;

export function validateObservation(input: unknown): EvidenceObservation {
  const parsed = EvidenceObservationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      `Invalid telemetry observation: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
    );
  }
  return parsed.data;
}

export function ingestObservation(input: unknown) {
  const observation = validateObservation(input);
  useTelemetryStore.getState().addObservation(observation);
  if (observation.location) {
    emitSpatialPulse({
      id: observation.id,
      center: [observation.location.lon, observation.location.lat],
      radius: Math.max(1000, Math.min(50_000, 1000 + observation.score * 250)),
      source: observation.source,
      timestamp: Date.now(),
    });
  }
  return observation;
}
