import { createFileRoute } from "@tanstack/react-router";
import { acceptHeartbeat, gc } from "@/services/assets/ephemeralAssetRegistry";

type HeartbeatBody = {
  assetId?: string;
  token?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
};

export const Route = createFileRoute("/api/assets/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        gc();
        try {
          const body = (await request.json()) as HeartbeatBody;
          if (!body.assetId || !body.token || !body.name) {
            return Response.json(
              { ok: false, error: "assetId, token, and name are required" },
              { status: 400 },
            );
          }

          const heartbeat = await acceptHeartbeat(body.assetId, body.token, {
            name: body.name.slice(0, 128),
            ...(body.latitude !== undefined ? { latitude: body.latitude } : {}),
            ...(body.longitude !== undefined ? { longitude: body.longitude } : {}),
            ...(body.accuracyM !== undefined ? { accuracyM: body.accuracyM } : {}),
          });

          return Response.json(
            { ok: true, heartbeat },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (cause) {
          return Response.json(
            { ok: false, error: cause instanceof Error ? cause.message : "Heartbeat rejected" },
            { status: 401 },
          );
        }
      },
    },
  },
});
