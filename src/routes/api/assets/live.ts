import { createFileRoute } from "@tanstack/react-router";
import { authenticateSessionRequest } from "@/services/p2p/security";
import { listLiveAssets } from "@/services/assets/ephemeralAssetRegistry";

export const Route = createFileRoute("/api/assets/live")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const session = await authenticateSessionRequest(request, context.env);
        if (!session) {
          return Response.json(
            { ok: false, error: "Authenticated operator session required" },
            { status: 401 },
          );
        }
        return Response.json(
          { ok: true, assets: listLiveAssets() },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
