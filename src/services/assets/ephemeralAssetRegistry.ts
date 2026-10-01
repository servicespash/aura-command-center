export type AssetHeartbeat = {
  assetId: string;
  name: string;
  observedAt: number;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  networkAddress?: string;
};

type Enrollment = {
  tokenHash: string;
  expiresAt: number;
};

const enrollments = new Map<string, Enrollment>();
const heartbeats = new Map<string, AssetHeartbeat>();
const TTL_MS = 60_000;
const ENROLLMENT_TTL_MS = 10 * 60_000;
const encoder = new TextEncoder();

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,96}$/.test(value);
}

export async function issueEnrollment(
  assetId: string,
): Promise<{ token: string; expiresAt: number }> {
  if (!validId(assetId)) throw new Error("Invalid asset identifier");
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();
  const expiresAt = Date.now() + ENROLLMENT_TTL_MS;
  enrollments.set(assetId, { tokenHash: await digest(token), expiresAt });
  return { token, expiresAt };
}

export async function acceptHeartbeat(
  assetId: string,
  token: string,
  heartbeat: Omit<AssetHeartbeat, "assetId" | "observedAt">,
): Promise<AssetHeartbeat> {
  const enrollment = enrollments.get(assetId);
  if (!enrollment || enrollment.expiresAt <= Date.now()) {
    enrollments.delete(assetId);
    throw new Error("Asset enrollment expired");
  }

  if ((await digest(token)) !== enrollment.tokenHash) {
    throw new Error("Invalid asset enrollment token");
  }

  if (heartbeat.latitude !== undefined && (heartbeat.latitude < -90 || heartbeat.latitude > 90)) {
    throw new Error("Invalid latitude");
  }
  if (
    heartbeat.longitude !== undefined &&
    (heartbeat.longitude < -180 || heartbeat.longitude > 180)
  ) {
    throw new Error("Invalid longitude");
  }
  if (
    heartbeat.accuracyM !== undefined &&
    (heartbeat.accuracyM < 0 || heartbeat.accuracyM > 1_000_000)
  ) {
    throw new Error("Invalid location accuracy");
  }

  const value: AssetHeartbeat = { ...heartbeat, assetId, observedAt: Date.now() };
  heartbeats.set(assetId, value);
  return value;
}

export function listLiveAssets(now = Date.now()): AssetHeartbeat[] {
  gc(now);
  return [...heartbeats.values()];
}

export function revokeAsset(assetId: string): void {
  enrollments.delete(assetId);
  heartbeats.delete(assetId);
}

export function gc(now = Date.now()): void {
  for (const [assetId, enrollment] of enrollments) {
    if (enrollment.expiresAt <= now) enrollments.delete(assetId);
  }
  for (const [assetId, heartbeat] of heartbeats) {
    if (now - heartbeat.observedAt > TTL_MS) heartbeats.delete(assetId);
  }
}
