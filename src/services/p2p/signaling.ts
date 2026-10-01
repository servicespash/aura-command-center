export type SignalMessage =
  | { type: "offer"; room: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; room: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "candidate"; room: string; from: string; candidate: RTCIceCandidateInit }
  | { type: "leave"; room: string; from: string };

export type SignalTransport = {
  send(message: SignalMessage): Promise<void>;
  receive(handler: (message: SignalMessage) => void): () => void;
};

function nonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export class HttpPollingSignalTransport implements SignalTransport {
  private timer: ReturnType<typeof setInterval> | undefined;
  private token: string | undefined;

  constructor(
    private readonly endpoint = "/api/p2p/signal",
    private readonly pollMs = 1000,
  ) {}

  private async getToken(): Promise<string> {
    if (this.token) return this.token;
    const response = await fetch("/api/p2p/token", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Unable to obtain signaling token: HTTP ${response.status}`);
    const payload = (await response.json()) as { ok?: boolean; token?: string };
    if (!payload.ok || !payload.token) throw new Error("Signaling token was not issued");
    this.token = payload.token;
    return payload.token;
  }

  async send(message: SignalMessage): Promise<void> {
    const token = await this.getToken();
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        message,
        nonce: nonce(),
        timestamp: Date.now(),
      }),
    });
    if (response.status === 401) {
      this.token = undefined;
      throw new Error("Signaling session expired");
    }
    if (!response.ok) throw new Error(`Signaling send failed: HTTP ${response.status}`);
  }

  receive(handler: (message: SignalMessage) => void): () => void {
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const token = await this.getToken();
        const peerId = this.peerId;
        const url = new URL(this.endpoint, window.location.origin);
        url.searchParams.set("room", this.room);
        url.searchParams.set("peerId", peerId);
        const response = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          headers: { authorization: `Bearer ${token}` },
        });
        if (response.status === 401) this.token = undefined;
        if (!response.ok) return;
        const messages = (await response.json()) as SignalMessage[];
        messages.forEach(handler);
      } catch {
        // Polling failures are transient. The next bounded interval retries.
      }
    };

    void poll();
    this.timer = setInterval(() => void poll(), this.pollMs);
    return () => {
      active = false;
      if (this.timer) clearInterval(this.timer);
    };
  }

  setIdentity(room: string, peerId: string) {
    this.room = room;
    this.peerId = peerId;
  }

  private room = "";
  private peerId = "";
}

export class P2PSignalingPeer {
  private readonly pc: RTCPeerConnection;
  private readonly transport: HttpPollingSignalTransport;
  private readonly room: string;
  private readonly peerId = crypto.randomUUID();
  private stopReceiving: (() => void) | undefined;

  constructor(room: string, transport = new HttpPollingSignalTransport()) {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(room)) throw new Error("Invalid signaling room");
    this.room = room;
    this.transport = transport;
    this.transport.setIdentity(room, this.peerId);
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        void this.transport.send({
          type: "candidate",
          room: this.room,
          from: this.peerId,
          candidate: candidate.toJSON(),
        });
      }
    };

    this.stopReceiving = this.transport.receive((message) => {
      if (message.room === this.room && message.from !== this.peerId) void this.handleSignal(message);
    });
  }

  createDataChannel(label = "aura"): RTCDataChannel {
    return this.pc.createDataChannel(label, { ordered: true });
  }

  async createOffer(): Promise<void> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.transport.send({
      type: "offer",
      room: this.room,
      from: this.peerId,
      sdp: offer,
    });
  }

  onDataChannel(handler: (channel: RTCDataChannel) => void) {
    this.pc.ondatachannel = (event) => handler(event.channel);
  }

  async close(): Promise<void> {
    this.stopReceiving?.();
    this.pc.close();
    await this.transport.send({ type: "leave", room: this.room, from: this.peerId });
  }

  private async handleSignal(message: SignalMessage): Promise<void> {
    if (message.type === "offer") {
      if (this.pc.signalingState !== "stable") return;
      await this.pc.setRemoteDescription(message.sdp);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this.transport.send({
        type: "answer",
        room: this.room,
        from: this.peerId,
        sdp: answer,
      });
    } else if (message.type === "answer") {
      if (this.pc.signalingState !== "have-local-offer") return;
      await this.pc.setRemoteDescription(message.sdp);
    } else if (message.type === "candidate") {
      try {
        await this.pc.addIceCandidate(message.candidate);
      } catch {
        // Ignore late ICE candidates after peer teardown.
      }
    }
  }
}
