import { createFileRoute } from "@tanstack/react-router";
import { createAuthorizationUrl } from "@/services/auth/providerAuth";

export const Route = createFileRoute("/api/auth/start")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        try {
          const provider = new URL(request.url).searchParams.get("provider")?.trim().toLowerCase();
          if (!provider) return Response.json({ ok: false, error: "Provider is required" }, { status: 400 });
          const redirectUri = new URL("/api/auth/callback", request.url).toString();
          const result = await createAuthorizationUrl(provider, redirectUri, context.env);
          return new Response(null, {
            status: 302,
            headers: {
              location: result.url,
              "set-cookie": `aura_oauth_state=${result.state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
            },
          });
        } catch (cause) {
          return Response.json({ ok: false, error: cause instanceof Error ? cause.message : "Authentication start failed" }, { status: 400 });
        }
      },
    },
  },
});
