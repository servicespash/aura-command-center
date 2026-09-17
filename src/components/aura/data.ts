
/**
 * Real-world security risk indices (0-100).
 * Country risk based on Global Cybersecurity Index and known proxy density.
 */
const COUNTRY_RISK: Record<string, number> = {
  "United States": 12,
  Germany: 8,
  Singapore: 10,
  "United Kingdom": 9,
  Japan: 7,
  Netherlands: 15,
  Australia: 11,
  Brazil: 45,
  India: 38,
  Russia: 88,
  Uganda: 52,
  Nigeria: 76,
  China: 82,
  Iran: 92,
  "North Korea": 98,
};

/**
 * ASN Reputation Index.
 * Residential ISPs usually have lower risk than cloud hosting or dedicated proxies.
 */
const ASN_RISK: Record<string, number> = {
  Amazon: 65, // AWS is often used for botnets/scrapers
  Hetzner: 75, // Common for cheap VPS/scanners
  Selectel: 82, // High volume of scanner traffic
  Google: 45, // GCP
  Claro: 25, // Residential ISP
  Jio: 20, // Residential ISP
  "Andrews & Arnold": 15, // High-quality UK ISP
  "Aussie Broadband": 15, // Residential ISP
  KDDI: 18, // Residential ISP
  "Roke Telkom": 35, // Regional ISP
  LeaseWeb: 70, // Dedicated server host
  MainOne: 40, // Regional backbone
};

/**
 * Subdomain Sensitivity Index.
 * Critical infrastructure like vaults or admin panels are high-value targets.
 */
const SUBDOMAIN_SENSITIVITY: Record<string, number> = {
  vault: 95,
  admin: 90,
  auth: 85,
  api: 60,
  pay: 80,
  docs: 30,
  cdn: 40,
  status: 20,
  edge: 50,
  app: 55,
};

export type GeoNode = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  country: string;
  asn: string;
  asnOrg: string;
  connections: number;
  countryRiskIndex: number;
  asnRiskIndex: number;
  sensitivityIndex: number;
  targetSubdomain: string;
  ip: string;
  email: string | null;
  history: ConnectionRecord[];
};

export type ConnectionRecord = {
  at: Date;
  ip: string;
  subdomain: string;
  action: string;
};

export function frequencyScore(connections: number) {
  return Math.min(100, Math.round((connections / 4000) * 100));
}

export function threatScore(node: GeoNode) {
  const score =
    frequencyScore(node.connections) * 0.3 +
    node.countryRiskIndex * 0.2 +
    node.asnRiskIndex * 0.25 +
    node.sensitivityIndex * 0.25;
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

export const AUTH_PROVIDERS = [
  "Google OAuth",
  "GitHub",
  "Okta",
  "Azure AD"
];

export type Tenant = {
  domain: string;
  status: "verified" | "pending" | "failed";
  method: string; // Dynamic provider
  key: string;
  events24h: number;
};

export type EgressNode = {
  id: string;
  region: string;
  city: string;
  decoy: string;
  latency: number;
  masked: boolean;
};

export const EGRESS_NODES: EgressNode[] = [
  {
    id: "GH-01",
    region: "eu-central",
    city: "Frankfurt",
    decoy: "185.22.14.9",
    latency: 38,
    masked: true,
  },
  {
    id: "GH-02",
    region: "us-east",
    city: "Ashburn",
    decoy: "23.129.64.217",
    latency: 96,
    masked: true,
  },
  {
    id: "GH-03",
    region: "ap-south",
    city: "Mumbai",
    decoy: "103.86.49.12",
    latency: 142,
    masked: true,
  },
  {
    id: "GH-04",
    region: "sa-east",
    city: "Sao Paulo",
    decoy: "177.54.203.88",
    latency: 168,
    masked: true,
  },
  {
    id: "GH-05",
    region: "af-east",
    city: "Nairobi",
    decoy: "197.248.11.64",
    latency: 74,
    masked: true,
  },
  {
    id: "GH-06",
    region: "ap-southeast",
    city: "Singapore",
    decoy: "146.70.83.201",
    latency: 121,
    masked: false,
  },
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
  lat?: number;
  lon?: number;
  destLat?: number;
  destLon?: number;
};

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
