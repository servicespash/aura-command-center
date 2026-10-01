import { createFileRoute } from "@tanstack/react-router";
import { authenticateSessionRequest } from "@/services/p2p/security";
import { issueEnrollment } from "@/services/assets/ephemeralAssetRegistry";

export const Route = createFileRoute("/api/assets/enroll")({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        const session = await authenticateSessionRequest(request, context.env);
        if (!session) {
          return Response.json(
            { ok: false, error: "Authenticated operator session required" },
            { status: 401 },
          );
        }

        try {
          const body = (await request.json()) as { assetId?: string };
          if (!body.assetId) {
            return Response.json({ ok: false, error: "assetId is required" }, { status: 400 });
          }
          const enrollment = await issueEnrollment(body.assetId);
          return Response.json(
            { ok: true, assetId: body.assetId, ...enrollment },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (cause) {
          return Response.json(
            { ok: false, error: cause instanceof Error ? cause.message : "Enrollment failed" },
            { status: 400 },
          );
        }
      },
    },
  },
});
