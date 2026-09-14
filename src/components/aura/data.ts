import type { GeoNode } from "./GlobeCanvas";

export const SEED_NODES: GeoNode[] = [
  { id: "kla", lat: 0.31, lon: 32.58, label: "Kampala UG", threat: "low" },
  { id: "fra", lat: 50.11, lon: 8.68, label: "Frankfurt DE", threat: "medium" },
  { id: "sin", lat: 1.35, lon: 103.82, label: "Singapore SG", threat: "low" },
  { id: "iad", lat: 38.95, lon: -77.45, label: "Ashburn US", threat: "critical" },
  { id: "sao", lat: -23.55, lon: -46.63, label: "Sao Paulo BR", threat: "medium" },
  { id: "syd", lat: -33.87, lon: 151.21, label: "Sydney AU", threat: "low" },
  { id: "mow", lat: 55.75, lon: 37.62, label: "Moscow RU", threat: "critical" },
  { id: "bom", lat: 19.08, lon: 72.88, label: "Mumbai IN", threat: "medium" },
  { id: "lhr", lat: 51.51, lon: -0.13, label: "London UK", threat: "low" },
  { id: "nrt", lat: 35.68, lon: 139.69, label: "Tokyo JP", threat: "low" },
];

export type Tenant = {
  domain: string;
  status: "verified" | "pending" | "failed";
  method: "DNS TXT" | "OAuth domain";
  key: string;
  events24h: number;
};

export const SEED_TENANTS: Tenant[] = [
  { domain: "pash.services", status: "verified", method: "OAuth domain", key: "tk_9f13…a02", events24h: 184_302 },
  { domain: "edge.pash.services", status: "verified", method: "DNS TXT", key: "tk_4c88…b71", events24h: 92_118 },
  { domain: "client-atlas.io", status: "pending", method: "DNS TXT", key: "tk_pend…000", events24h: 0 },
  { domain: "vault.northgate.co", status: "failed", method: "DNS TXT", key: "tk_—", events24h: 0 },
];

export const EGRESS_NODES = [
  { id: "gh-01", region: "eu-central", decoy: "185.22.14.9", latency: 38 },
  { id: "gh-02", region: "us-east", decoy: "23.129.64.217", latency: 96 },
  { id: "gh-03", region: "ap-south", decoy: "103.86.49.12", latency: 142 },
  { id: "gh-04", region: "sa-east", decoy: "177.54.203.88", latency: 168 },
];

const ACTORS = [
  "port-scan sweep",
  "credential stuffing",
  "TLS fingerprint mismatch",
  "subdomain enumeration",
  "GeoIP anomaly",
  "rate-limit breach",
  "malformed header injection",
  "tor exit node contact",
];

export function randomEvent(nodes: GeoNode[]) {
  const node = nodes[Math.floor(Math.random() * nodes.length)]!;
  const severity: GeoNode["threat"] =
    Math.random() > 0.86 ? "critical" : Math.random() > 0.5 ? "medium" : "low";
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date(),
    origin: node.label,
    ip: `${10 + Math.floor(Math.random() * 220)}.${Math.floor(Math.random() * 255)}.${Math.floor(
      Math.random() * 255,
    )}.${Math.floor(Math.random() * 255)}`,
    kind: ACTORS[Math.floor(Math.random() * ACTORS.length)]!,
    severity,
  };
}

export type ThreatEvent = ReturnType<typeof randomEvent>;
