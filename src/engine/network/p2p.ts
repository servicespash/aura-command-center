// WebRTC mesh transport. Signaling is intentionally required; no synthetic handshake or encryption is used.

export class P2PMeshSocket {
  private static instance: P2PMeshSocket;
  private messageListeners: Set<(msg: string, fromId: string) => void> = new Set();
  public readonly nodeId = `node_${crypto.randomUUID()}`;

  private constructor() {}

  public static getInstance(): P2PMeshSocket {
    if (!P2PMeshSocket.instance) {
      P2PMeshSocket.instance = new P2PMeshSocket();
    }
    return P2PMeshSocket.instance;
  }

  public async connectTarget(_targetNodeId: string): Promise<boolean> {
    throw new Error("P2P signaling is not configured");
  }

  public sendMessage(_targetNodeId: string, _message: string): void {
    throw new Error("P2P data channel is not established");
  }

  public startListening(): void {}

  public onMessage(listener: (msg: string, fromId: string) => void): void {
    this.messageListeners.add(listener);
  }
}

export const globalP2PMesh = P2PMeshSocket.getInstance();
