import { createFileRoute } from "@tanstack/react-router";
import { verifySessionCookie } from "@/services/auth/providerAuth";

function readCookie(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  const value = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("aura_session="));
  return value ? decodeURIComponent(value.slice("aura_session=".length)) : null;
}

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const value = readCookie(request);
        if (!value) {
          return Response.json(
            { authenticated: false },
            { headers: { "cache-control": "no-store" } },
          );
        }
        const claims = await verifySessionCookie(value, context.env);
        if (!claims) {
          return Response.json(
            { authenticated: false },
            { headers: { "cache-control": "no-store" } },
          );
        }
        return Response.json(
          {
            authenticated: true,
            provider: claims.provider,
            subject: claims.subject,
            email: claims.email ?? null,
            name: claims.name ?? null,
          },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
