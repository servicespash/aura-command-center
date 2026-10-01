import { ingestObservation } from "@/lib/EvidencePipeline";

export { validateObservation } from "@/lib/EvidencePipeline";

export function ingestVerifiedEvent(input: unknown) {
  return ingestObservation(input);
}
