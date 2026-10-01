import { createFileRoute } from "@tanstack/react-router";

type StoredSignal = {
  message: unknown;
  createdAt: number;
};

const rooms = new Map<string, StoredSignal[]>();
const MAX_MESSAGES_PER_ROOM = 128;
const TTL_MS = 60_000;

function cleanup(room: string) {
  const messages = rooms.get(room) ?? [];
  const fresh = messages.filter((entry) => Date.now() - entry.createdAt < TTL_MS);
  if (fresh.length) rooms.set(room, fresh.slice(-MAX_MESSAGES_PER_ROOM));
  else rooms.delete(room);
}

export const Route = createFileRoute("/api/p2p/signal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { room?: string; from?: string };
        if (!body.room || !body.from) {
          return Response.json({ ok: false, error: "room and from are required" }, { status: 400 });
        }
        cleanup(body.room);
        const queue = rooms.get(body.room) ?? [];
        queue.push({ message: body, createdAt: Date.now() });
        rooms.set(body.room, queue.slice(-MAX_MESSAGES_PER_ROOM));
        return Response.json({ ok: true });
      },
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const room = url.searchParams.get("room");
        if (!room) return Response.json([], { status: 400 });
        cleanup(room);
        const messages = (rooms.get(room) ?? []).map((entry) => entry.message);
        rooms.delete(room);
        return Response.json(messages);
      },
    },
  },
});
