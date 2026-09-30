import { z } from "zod";
import { useTelemetryStore } from "@/store/telemetryStore";

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
});

export type EvidenceObservation = z.infer<typeof EvidenceObservationSchema>;

export function validateObservation(input: unknown): EvidenceObservation {
  const parsed = EvidenceObservationSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      `Invalid telemetry observation: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
    );
  return parsed.data;
}

export function ingestObservation(input: unknown) {
  const observation = validateObservation(input);
  useTelemetryStore.getState().addObservation(observation);
  return observation;
}
