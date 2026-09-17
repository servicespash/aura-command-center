export interface RevocationRecord {
  sessionId: string;
  userId: string;
  revokedAt: number;
  reason: string;
}

export class EdgeRevocationMesh {
  // In-memory KV store acting as a distributed edge cache
  private revocationStore: Map<string, RevocationRecord> = new Map();

  /**
   * 1. Mint an instant revocation entry keyed by session_id and user_id.
   * 2. Broadcast the revocation event globally across edge nodes.
   */
  public async revokeSession(sessionId: string, userId: string, reason: string = 'ADMIN_ACTION'): Promise<void> {
    const record: RevocationRecord = {
      sessionId,
      userId,
      revokedAt: Date.now(),
      reason
    };

    // Store locally in Edge KV/Memory
    const cacheKey = this.buildCacheKey(sessionId, userId);
    this.revocationStore.set(cacheKey, record);

    console.log(`[EdgeRevocationMesh] Revocation minted for Session: ${sessionId}, User: ${userId}`);
    
    // Broadcast event to other nodes (Simulated)
    await this.broadcastRevocation(record);
  }

  private async broadcastRevocation(record: RevocationRecord): Promise<void> {
    // Simulate multi-region broadcast delay
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[EdgeRevocationMesh] Broadcast complete for ${record.sessionId}`);
        resolve();
      }, 50);
    });
  }

  /**
   * 3. Intercept and reject non-compliant JWTs/sessions at the gateway layer
   * before reaching backend application workers.
   */
  public gatewayInterceptor(sessionId: string, userId: string): boolean {
    const cacheKey = this.buildCacheKey(sessionId, userId);
    
    if (this.revocationStore.has(cacheKey)) {
      const record = this.revocationStore.get(cacheKey);
      console.warn(`[Gateway] Session rejected at Edge. Reason: ${record?.reason}`);
      return false; // Rejected
    }

    return true; // Allowed
  }

  public isUserBanned(userId: string): boolean {
    // Check if any active revocation exists globally for this user
    for (const record of this.revocationStore.values()) {
      if (record.userId === userId && record.reason.includes('BAN')) {
        return true;
      }
    }
    return false;
  }

  private buildCacheKey(sessionId: string, userId: string): string {
    return `${userId}:::${sessionId}`;
  }
}

export const globalRevocationMesh = new EdgeRevocationMesh();
