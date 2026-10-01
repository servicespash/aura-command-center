export type SignalMessage =
  | { type: "offer"; room: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; room: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "candidate"; room: string; from: string; candidate: RTCIceCandidateInit }
  | { type: "leave"; room: string; from: string };

export type SignalTransport = {
  send(message: SignalMessage): Promise<void>;
  receive(handler: (message: SignalMessage) => void): () => void;
};

export class HttpPollingSignalTransport implements SignalTransport {
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly endpoint = "/api/p2p/signal",
    private readonly pollMs = 1000,
  ) {}

  async send(message: SignalMessage): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(message),
    });
    if (!response.ok) throw new Error(`Signaling send failed: HTTP ${response.status}`);
  }

  receive(handler: (message: SignalMessage) => void): () => void {
    let active = true;
    const poll = async () => {
      if (!active) return;
      const response = await fetch(this.endpoint, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;
      const messages = (await response.json()) as SignalMessage[];
      messages.forEach(handler);
    };

    void poll();
    this.timer = setInterval(() => void poll(), this.pollMs);
    return () => {
      active = false;
      if (this.timer) clearInterval(this.timer);
    };
  }
}

export class P2PSignalingPeer {
  private readonly pc: RTCPeerConnection;
  private readonly transport: SignalTransport;
  private readonly room: string;
  private readonly peerId = crypto.randomUUID();
  private stopReceiving: (() => void) | undefined;

  constructor(room: string, transport = new HttpPollingSignalTransport()) {
    this.room = room;
    this.transport = transport;
    this.pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

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

    this.stopReceiving = this.transport.receive((message) => void this.handleSignal(message));
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

  async close(): Promise<void> {
    this.stopReceiving?.();
    this.pc.close();
    await this.transport.send({ type: "leave", room: this.room, from: this.peerId });
  }

  onDataChannel(handler: (channel: RTCDataChannel) => void) {
    this.pc.ondatachannel = (event) => handler(event.channel);
  }

  private async handleSignal(message: SignalMessage): Promise<void> {
    if (message.room !== this.room || message.from === this.peerId) return;

    if (message.type === "offer") {
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
      await this.pc.setRemoteDescription(message.sdp);
    } else if (message.type === "candidate") {
      await this.pc.addIceCandidate(message.candidate);
    }
  }
}
