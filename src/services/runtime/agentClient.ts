import type { ProbeRequest, ProbeResponse } from "@/agent/protocol";

const AGENT_URL = import.meta.env["VITE_AURA_AGENT_URL"] || "http://127.0.0.1:4317";
const TOKEN = import.meta.env["VITE_AURA_AGENT_TOKEN"] || "";

export async function agentProbe(request: ProbeRequest): Promise<ProbeResponse> {
  if (!TOKEN) throw new Error("AURA runtime agent is not configured");
  const response = await fetch(`${AGENT_URL}/probe`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(request),
  });
  const result = (await response.json()) as ProbeResponse;
  if (!response.ok || !result.ok)
    throw new Error(result.error || `Agent returned HTTP ${response.status}`);
  return result;
}
