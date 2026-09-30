import { createFileRoute } from "@tanstack/react-router";
import { verifyAccess } from "@/services/security/serverAuth";

type AuthRequest = {
  email?: string;
  totp?: string;
  sessionKey?: string;
};

export const Route = createFileRoute("/api/auth/verify")({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        try {
          const body = (await request.json()) as AuthRequest;
          await verifyAccess(body, context.env);
          return Response.json({ ok: true });
        } catch (cause) {
          const message =
            cause instanceof Error ? cause.message : "Authentication failed";
          return Response.json({ ok: false, error: message }, { status: 401 });
        }
      },
    },
  },
});
