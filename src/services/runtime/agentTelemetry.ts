import { ingestVerifiedEvent } from "./telemetryIngest";
const AGENT_URL = import.meta.env.VITE_AURA_AGENT_URL || "http://127.0.0.1:4317";
const TOKEN = import.meta.env.VITE_AURA_AGENT_TOKEN || "";

export type AgentStatus = "online" | "offline" | "waiting";

export async function collectAgentObservation(host: string, port = 443) {
  if (!TOKEN) throw new Error("AGENT_NOT_CONFIGURED");
  const response = await fetch(`${AGENT_URL}/probe`, {
    method:"POST", headers:{"content-type":"application/json",authorization:`Bearer ${TOKEN}`},
    body:JSON.stringify({operation:"tcp",host,port,timeoutMs:5000}), cache:"no-store"
  });
  const result = await response.json() as { ok?: boolean; durationMs?: number; data?: unknown; error?: string };
  if (!response.ok || !result.ok) throw new Error(result.error || `AGENT_HTTP_${response.status}`);
  return ingestVerifiedEvent({
    id: crypto.randomUUID(), timestamp:new Date().toISOString(), source:"aura-runtime-agent",
    target:`${host}:${port}`, operation:"tcp", result,
    provenance:{agent:AGENT_URL,transport:"aura-runtime-agent",receivedAt:new Date().toISOString()},
    score:0
  });
}