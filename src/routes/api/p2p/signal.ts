import { createFileRoute } from "@tanstack/react-router";
import { authenticateP2PToken, validatePeerId, validateRoom } from "@/services/p2p/security";

type SignalMessage =
  | { type: "offer"; room: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; room: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "candidate"; room: string; from: string; candidate: RTCIceCandidateInit }
  | { type: "leave"; room: string; from: string };

type StoredSignal = {
  message: SignalMessage;
  createdAt: number;
};

type PeerState = {
  lastSeen: number;
  nonces: Set<string>;
  requestTimes: number[];
};

type RoomState = {
  messages: StoredSignal[];
  peers: Map<string, PeerState>;
  lastActivity: number;
};

const rooms = new Map<string, RoomState>();
const TTL_MS = 30_000;
const MAX_MESSAGES_PER_ROOM = 64;
const MAX_PEERS_PER_ROOM = 2;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

function gc(now = Date.now()) {
  for (const [roomId, room] of rooms) {
    for (const [peerId, peer] of room.peers) {
      if (now - peer.lastSeen > TTL_MS) room.peers.delete(peerId);
    }
    room.messages = room.messages.filter((entry) => now - entry.createdAt <= TTL_MS);
    if (!room.peers.size && now - room.lastActivity > TTL_MS) rooms.delete(roomId);
  }
}

function rateLimit(peer: PeerState, now: number): boolean {
  peer.requestTimes = peer.requestTimes.filter((time) => now - time < RATE_WINDOW_MS);
  if (peer.requestTimes.length >= MAX_REQUESTS_PER_WINDOW) return false;
  peer.requestTimes.push(now);
  return true;
}

function headerToken(request: Request): string | null {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

function validMessage(value: unknown): value is SignalMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (!["offer", "answer", "candidate", "leave"].includes(String(message["type"]))) return false;
  if (typeof message["room"] !== "string" || typeof message["from"] !== "string") return false;
  if (!validateRoom(message["room"]) || !validatePeerId(message["from"])) return false;
  if (message["type"] === "offer" || message["type"] === "answer") {
    const sdp = message["sdp"] as Record<string, unknown> | undefined;
    return Boolean(
      sdp &&
      typeof sdp["type"] === "string" &&
      typeof sdp["sdp"] === "string" &&
      String(sdp["sdp"]).length <= 256_000,
    );
  }
  if (message["type"] === "candidate") {
    const candidate = message["candidate"] as Record<string, unknown> | undefined;
    return Boolean(
      candidate &&
      typeof candidate["candidate"] === "string" &&
      String(candidate["candidate"]).length <= 16_384,
    );
  }
  return true;
}

export const Route = createFileRoute("/api/p2p/signal")({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        gc();
        const token = headerToken(request);
        if (!token)
          return Response.json(
            { ok: false, error: "Signed signaling token required" },
            { status: 401 },
          );
        const claims = await authenticateP2PToken(token, context.env);
        if (!claims)
          return Response.json(
            { ok: false, error: "Invalid or expired signaling token" },
            { status: 401 },
          );

        const body = (await request.json()) as {
          message?: unknown;
          nonce?: string;
          timestamp?: number;
        };
        const message = body.message;
        if (!validMessage(message) || !body.nonce || !/^[A-Za-z0-9_-]{16,128}$/.test(body.nonce)) {
          return Response.json(
            { ok: false, error: "Malformed signaling envelope" },
            { status: 400 },
          );
        }
        if (message["from"] !== claims.sub) {
          return Response.json(
            { ok: false, error: "Peer identity does not match session" },
            { status: 403 },
          );
        }

        const now = Date.now();
        if (typeof body.timestamp !== "number" || Math.abs(now - body.timestamp) > 30_000) {
          return Response.json({ ok: false, error: "Stale signaling envelope" }, { status: 409 });
        }

        const room: RoomState = rooms.get(message["room"]) ?? {
          messages: [],
          peers: new Map<string, PeerState>(),
          lastActivity: now,
        };
        const peer = room.peers.get(message["from"]) ?? {
          lastSeen: now,
          nonces: new Set(),
          requestTimes: [],
        };
        if (!rateLimit(peer, now)) {
          return Response.json(
            { ok: false, error: "Signaling rate limit exceeded" },
            { status: 429 },
          );
        }
        if (peer.nonces.has(body.nonce)) {
          return Response.json({ ok: false, error: "Replay detected" }, { status: 409 });
        }
        peer.nonces.add(body.nonce);
        peer.lastSeen = now;

        if (!room.peers.has(message["from"]) && room.peers.size >= MAX_PEERS_PER_ROOM) {
          return Response.json({ ok: false, error: "Room capacity reached" }, { status: 409 });
        }

        if (message["type"] === "leave") room.peers.delete(message["from"]);
        else room.peers.set(message["from"], peer);

        room.messages.push({ message, createdAt: now });
        room.messages = room.messages.slice(-MAX_MESSAGES_PER_ROOM);
        room.lastActivity = now;
        rooms.set(message["room"], room);
        return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
      },

      GET: async ({ request, context }) => {
        gc();
        const url = new URL(request.url);
        const roomId = url.searchParams.get("room") ?? "";
        const peerId = url.searchParams.get("peerId") ?? "";
        const token = headerToken(request);
        if (!token || !validateRoom(roomId) || !validatePeerId(peerId)) {
          return Response.json(
            { ok: false, error: "Valid room, peer, and signaling token required" },
            { status: 400 },
          );
        }

        const claims = await authenticateP2PToken(token, context.env);
        if (!claims || claims.sub !== peerId) {
          return Response.json({ ok: false, error: "Invalid signaling token" }, { status: 401 });
        }

        const room = rooms.get(roomId);
        if (!room) return Response.json([], { headers: { "cache-control": "no-store" } });

        const peer = room.peers.get(peerId) ?? {
          lastSeen: Date.now(),
          nonces: new Set(),
          requestTimes: [],
        };
        if (!rateLimit(peer, Date.now())) {
          return Response.json(
            { ok: false, error: "Signaling rate limit exceeded" },
            { status: 429 },
          );
        }
        peer.lastSeen = Date.now();
        room.peers.set(peerId, peer);

        const messages = room.messages
          .filter((entry) => entry.message["from"] !== peerId)
          .map((entry) => entry.message);

        return Response.json(messages, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
