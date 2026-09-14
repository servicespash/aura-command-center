export type RiskLevel = "low" | "medium" | "high";

export type ConnectionRecord = {
  at: Date;
  ip: string;
  subdomain: string;
  action: string;
};

export type GeoNode = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  country: string;
  asn: string;
  /** Connections observed in the trailing 24h window — drives 40% of the score. */
  connections: number;
  /** Country / ASN reputation — drives 35% of the score. */
  geoRisk: RiskLevel;
  /** Sensitivity of the subdomain being probed — drives 25% of the score. */
  subdomainRisk: RiskLevel;
  targetSubdomain: string;
  ip: string;
  email: string | null;
  history: ConnectionRecord[];
};

const RISK_VALUE: Record<RiskLevel, number> = { low: 15, medium: 55, high: 95 };

/** Frequency component: saturates at 4,000 connections / 24h. */
export function frequencyScore(connections: number) {
  return Math.min(100, Math.round((connections / 4000) * 100));
}

/** Weighted 0–100 threat score: frequency 40%, geo risk 35%, subdomain risk 25%. */
export function threatScore(node: GeoNode) {
  const score =
    frequencyScore(node.connections) * 0.4 +
    RISK_VALUE[node.geoRisk] * 0.35 +
    RISK_VALUE[node.subdomainRisk] * 0.25;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export type ThreatBand = "clear" | "elevated" | "critical";

export function threatBand(score: number): ThreatBand {
  return score >= 70 ? "critical" : score >= 30 ? "elevated" : "clear";
}

export function bandLabel(band: ThreatBand) {
  return band === "critical" ? "CRITICAL" : band === "elevated" ? "ELEVATED" : "CLEAR";
}

export function bandTextClass(band: ThreatBand) {
  return band === "critical"
    ? "text-destructive"
    : band === "elevated"
      ? "text-warning"
      : "text-success";
}

function randomIp() {
  return `${10 + Math.floor(Math.random() * 220)}.${Math.floor(Math.random() * 255)}.${Math.floor(
    Math.random() * 255,
  )}.${Math.floor(Math.random() * 255)}`;
}

const ACTIONS = [
  "GET /api/session",
  "POST /auth/token",
  "HEAD /.env probe",
  "GET /admin",
  "OPTIONS /graphql",
  "POST /telemetry/ingest",
];

function seedHistory(subdomain: string, count: number): ConnectionRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    at: new Date(Date.now() - (i + 1) * (1000 * 60 * (7 + Math.floor(Math.random() * 40)))),
    ip: randomIp(),
    subdomain,
    action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)]!,
  }));
}

type Seed = Omit<GeoNode, "history" | "ip"> & { ip?: string };

const SEEDS: Seed[] = [
  {
    id: "kla",
    lat: 0.31,
    lon: 32.58,
    label: "Kampala UG",
    country: "Uganda",
    asn: "AS37075 Roke Telkom",
    connections: 640,
    geoRisk: "low",
    subdomainRisk: "low",
    targetSubdomain: "edge.pash.services",
    email: "ops@pash.services",
  },
  {
    id: "fra",
    lat: 50.11,
    lon: 8.68,
    label: "Frankfurt DE",
    country: "Germany",
    asn: "AS24940 Hetzner",
    connections: 2180,
    geoRisk: "medium",
    subdomainRisk: "medium",
    targetSubdomain: "api.pash.services",
    email: null,
  },
  {
    id: "sin",
    lat: 1.35,
    lon: 103.82,
    label: "Singapore SG",
    country: "Singapore",
    asn: "AS16509 Amazon",
    connections: 910,
    geoRisk: "low",
    subdomainRisk: "medium",
    targetSubdomain: "cdn.pash.services",
    email: null,
  },
  {
    id: "iad",
    lat: 38.95,
    lon: -77.45,
    label: "Ashburn US",
    country: "United States",
    asn: "AS14618 Amazon",
    connections: 3720,
    geoRisk: "medium",
    subdomainRisk: "high",
    targetSubdomain: "vault.pash.services",
    email: "svc-runner@client-atlas.io",
  },
  {
    id: "sao",
    lat: -23.55,
    lon: -46.63,
    label: "Sao Paulo BR",
    country: "Brazil",
    asn: "AS28573 Claro",
    connections: 1490,
    geoRisk: "medium",
    subdomainRisk: "medium",
    targetSubdomain: "pay.pash.services",
    email: null,
  },
  {
    id: "syd",
    lat: -33.87,
    lon: 151.21,
    label: "Sydney AU",
    country: "Australia",
    asn: "AS4764 Aussie Broadband",
    connections: 420,
    geoRisk: "low",
    subdomainRisk: "low",
    targetSubdomain: "status.pash.services",
    email: null,
  },
  {
    id: "mow",
    lat: 55.75,
    lon: 37.62,
    label: "Moscow RU",
    country: "Russia",
    asn: "AS49505 Selectel",
    connections: 2860,
    geoRisk: "high",
    subdomainRisk: "high",
    targetSubdomain: "admin.pash.services",
    email: null,
  },
  {
    id: "bom",
    lat: 19.08,
    lon: 72.88,
    label: "Mumbai IN",
    country: "India",
    asn: "AS55836 Jio",
    connections: 1740,
    geoRisk: "medium",
    subdomainRisk: "low",
    targetSubdomain: "docs.pash.services",
    email: null,
  },
  {
    id: "lhr",
    lat: 51.51,
    lon: -0.13,
    label: "London UK",
    country: "United Kingdom",
    asn: "AS20712 Andrews & Arnold",
    connections: 1120,
    geoRisk: "low",
    subdomainRisk: "medium",
    targetSubdomain: "app.pash.services",
    email: "audit@northgate.co",
  },
  {
    id: "nrt",
    lat: 35.68,
    lon: 139.69,
    label: "Tokyo JP",
    country: "Japan",
    asn: "AS2516 KDDI",
    connections: 780,
    geoRisk: "low",
    subdomainRisk: "low",
    targetSubdomain: "cdn.pash.services",
    email: null,
  },
  {
    id: "lag",
    lat: 6.52,
    lon: 3.38,
    label: "Lagos NG",
    country: "Nigeria",
    asn: "AS37282 MainOne",
    connections: 2340,
    geoRisk: "high",
    subdomainRisk: "medium",
    targetSubdomain: "auth.pash.services",
    email: null,
  },
  {
    id: "ams",
    lat: 52.37,
    lon: 4.9,
    label: "Amsterdam NL",
    country: "Netherlands",
    asn: "AS60781 LeaseWeb",
    connections: 3010,
    geoRisk: "medium",
    subdomainRisk: "high",
    targetSubdomain: "vault.northgate.co",
    email: null,
  },
];

export const SEED_NODES: GeoNode[] = SEEDS.map((s) => ({
  ...s,
  ip: s.ip ?? randomIp(),
  history: seedHistory(s.targetSubdomain, 5),
}));

export type Tenant = {
  domain: string;
  status: "verified" | "pending" | "failed";
  method: "Google OAuth" | "DNS TXT";
  key: string;
  events24h: number;
};

export const SEED_TENANTS: Tenant[] = [
  { domain: "pash.services", status: "verified", method: "Google OAuth", key: "tk_live_9f13a02", events24h: 184_302 },
  { domain: "edge.pash.services", status: "verified", method: "DNS TXT", key: "tk_live_4c88b71", events24h: 92_118 },
  { domain: "client-atlas.io", status: "pending", method: "DNS TXT", key: "tk_pend_000000", events24h: 0 },
  { domain: "vault.northgate.co", status: "failed", method: "DNS TXT", key: "tk_none", events24h: 0 },
];

export type EgressNode = {
  id: string;
  region: string;
  city: string;
  decoy: string;
  latency: number;
  masked: boolean;
};

export const EGRESS_NODES: EgressNode[] = [
  { id: "GH-01", region: "eu-central", city: "Frankfurt", decoy: "185.22.14.9", latency: 38, masked: true },
  { id: "GH-02", region: "us-east", city: "Ashburn", decoy: "23.129.64.217", latency: 96, masked: true },
  { id: "GH-03", region: "ap-south", city: "Mumbai", decoy: "103.86.49.12", latency: 142, masked: true },
  { id: "GH-04", region: "sa-east", city: "Sao Paulo", decoy: "177.54.203.88", latency: 168, masked: true },
  { id: "GH-05", region: "af-east", city: "Nairobi", decoy: "197.248.11.64", latency: 74, masked: true },
  { id: "GH-06", region: "ap-southeast", city: "Singapore", decoy: "146.70.83.201", latency: 121, masked: false },
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

export type ThreatEvent = {
  id: string;
  at: Date;
  nodeId: string;
  origin: string;
  ip: string;
  kind: string;
  subdomain: string;
  severity: ThreatBand;
  score: number;
};

/** Structured telemetry event derived from a node's live threat score. */
export function randomEvent(nodes: GeoNode[]): ThreatEvent {
  const node = nodes[Math.floor(Math.random() * nodes.length)]!;
  const base = threatScore(node);
  const score = Math.max(0, Math.min(100, base + Math.floor(Math.random() * 24) - 12));
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date(),
    nodeId: node.id,
    origin: node.label,
    ip: randomIp(),
    kind: ACTORS[Math.floor(Math.random() * ACTORS.length)]!,
    subdomain: node.targetSubdomain,
    severity: threatBand(score),
    score,
  };
}

export function eventToRecord(e: ThreatEvent): ConnectionRecord {
  return { at: e.at, ip: e.ip, subdomain: e.subdomain, action: e.kind };
}

export function generateTxtToken() {
  return `aura-verify=${Math.random().toString(36).slice(2, 10)}${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function generateTelemetryKey() {
  return `tk_live_${Math.random().toString(36).slice(2, 9)}${Math.random().toString(36).slice(2, 6)}`;
}
