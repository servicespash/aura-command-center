import { createFileRoute } from "@tanstack/react-router";
import { authenticateSessionRequest, issueP2PToken } from "@/services/p2p/security";

export const Route = createFileRoute("/api/p2p/token")({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        const session = await authenticateSessionRequest(request, context.env);
        if (!session)
          return Response.json(
            { ok: false, error: "Authenticated session required" },
            { status: 401 },
          );
        const token = await issueP2PToken(session, context.env);
        return Response.json(
          { ok: true, token },
          {
            headers: { "cache-control": "no-store" },
          },
        );
      },
    },
  },
});
