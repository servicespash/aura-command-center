import { createFileRoute } from "@tanstack/react-router";
import { createSessionCookie, exchangeCallback, verifyOAuthState } from "@/services/auth/providerAuth";

function cookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  const match = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export const Route = createFileRoute("/api/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        try {
          const url = new URL(request.url);
          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state");
          if (!code || !state) throw new Error("Authorization callback is incomplete");

          const storedState = cookie(request, "aura_oauth_state");
          if (!storedState || storedState !== state) throw new Error("Authorization state mismatch");

          const verified = await verifyOAuthState(state, context.env);
          if (!verified) throw new Error("Authorization state expired or invalid");

          const redirectUri = new URL("/api/auth/callback", request.url).toString();
          const claims = await exchangeCallback(verified.provider, code, redirectUri, context.env);
          if (!claims.subject) throw new Error("Provider returned no stable account identifier");

          const session = await createSessionCookie(claims, context.env);
          return new Response(null, {
            status: 302,
            headers: {
              location: "/?auth=complete",
              "set-cookie": [
                session,
                "aura_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
              ].join(", "),
            },
          });
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "Authentication callback failed";
          return new Response(message, { status: 401, headers: { "content-type": "text/plain; charset=utf-8" } });
        }
      },
    },
  },
});
