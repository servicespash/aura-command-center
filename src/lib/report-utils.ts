import { Tenant, ThreatEvent } from "../components/aura/data";

export interface SessionReport {
  timestamp: string;
  tenants: Tenant[];
  events: ThreatEvent[];
  activeNodes: number;
  egressIndex: number;
}

export function generateSessionReport(sessionState: SessionReport) {
  const data = JSON.stringify(sessionState, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aura-report-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
