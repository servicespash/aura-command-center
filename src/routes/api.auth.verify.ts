import { createServerFileRoute } from "@tanstack/react-start/server";
import { verifyAccess } from "@/services/security/serverAuth";

export const ServerRoute = createServerFileRoute().methods({
  POST: async ({ request }) => {
    try {
      const body = (await request.json()) as { email?: string; totp?: string; sessionKey?: string };
      const env = ((globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env ?? {}) as Record<string, unknown>;
      await verifyAccess(body, env);
      return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      return Response.json({ ok: false, error: error instanceof Error ? error.message : "Authentication failed" }, { status: 401, headers: { "cache-control": "no-store" } });
    }
  },
});