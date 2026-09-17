export enum TelemetryPayloadType {
  RAW_EDGE_PROBE = 'RAW_EDGE_PROBE',
  VERIFIED_TENANT_TELEMETRY = 'VERIFIED_TENANT_TELEMETRY'
}

export interface TelemetryPayload {
  type: TelemetryPayloadType;
  timestamp: number;
  ip: string;
  userAgent: string;
  path: string;
  // Included only for VERIFIED_TENANT_TELEMETRY
  sessionId?: string;
  hardwareFingerprint?: string;
  compositeKey?: string;
}

export interface ActiveSessionTracker {
  sessionId: string;
  hardwareFingerprint: string;
  compositeKey: string;
  ipHistory: string[];
  lastSeen: number;
}

export class TelemetrySink {
  private edgeProbeBuffer: TelemetryPayload[] = [];
  private activeSessions: Map<string, ActiveSessionTracker> = new Map();

  // Aggregates high-frequency bot scans
  private probeScanCounters: Map<string, number> = new Map();

  public ingest(payload: TelemetryPayload): void {
    if (payload.type === TelemetryPayloadType.RAW_EDGE_PROBE) {
      this.handleRawProbe(payload);
    } else if (payload.type === TelemetryPayloadType.VERIFIED_TENANT_TELEMETRY) {
      this.handleVerifiedTelemetry(payload);
    }
  }

  private handleRawProbe(payload: TelemetryPayload): void {
    const signature = `${payload.ip}:${payload.path}`;
    const count = this.probeScanCounters.get(signature) || 0;
    
    // Eliminate WebSocket/UI flooding by dropping excess high-frequency scans
    if (count > 50) {
      // Drop silently at proxy layer
      return;
    }
    
    this.probeScanCounters.set(signature, count + 1);
    this.edgeProbeBuffer.push(payload);
    
    // Periodic flush logic would go here
    if (this.edgeProbeBuffer.length > 1000) {
      this.flushProbes();
    }
  }

  private handleVerifiedTelemetry(payload: TelemetryPayload): void {
    if (!payload.sessionId || !payload.hardwareFingerprint) {
      console.warn('[TelemetrySink] Dropping verified telemetry missing session/hardware keys.');
      return;
    }

    const compositeKey = this.generateCompositeKey(payload.sessionId, payload.hardwareFingerprint);

    let session = this.activeSessions.get(compositeKey);
    if (!session) {
      session = {
        sessionId: payload.sessionId,
        hardwareFingerprint: payload.hardwareFingerprint,
        compositeKey,
        ipHistory: [payload.ip],
        lastSeen: payload.timestamp
      };
      this.activeSessions.set(compositeKey, session);
    } else {
      // Track IP shifts to preserve connection trails across mobile/VPN handovers
      const lastIp = session.ipHistory[session.ipHistory.length - 1];
      if (lastIp !== payload.ip) {
        session.ipHistory.push(payload.ip);
        console.log(`[TelemetrySink] IP Handover detected for ${compositeKey}: ${lastIp} -> ${payload.ip}`);
      }
      session.lastSeen = payload.timestamp;
    }
  }

  private generateCompositeKey(sessionId: string, hardwareFingerprint: string): string {
    // In production, this would use a cryptographic hash (e.g., HMAC-SHA256)
    return `session_${sessionId}::hw_${hardwareFingerprint}`;
  }

  private flushProbes(): void {
    // Simulated sink flush
    this.edgeProbeBuffer = [];
    // Reset high-frequency counters periodically
    this.probeScanCounters.clear();
  }

  public getSessionHistory(compositeKey: string): string[] | null {
    const session = this.activeSessions.get(compositeKey);
    return session ? session.ipHistory : null;
  }
}

export const globalTelemetrySink = new TelemetrySink();
