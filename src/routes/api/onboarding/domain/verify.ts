import { createFileRoute } from "@tanstack/react-router";

type DnsResponse = {
  Answer?: Array<{ data?: string }>;
};

export const Route = createFileRoute("/api/onboarding/domain/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { domain?: string; token?: string };
        const domain = String(body.domain ?? "").trim().toLowerCase();
        const token = String(body.token ?? "").trim();

        if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/.test(domain)) {
          return Response.json({ ok: false, error: "Invalid domain name" }, { status: 400 });
        }
        if (!token || token.length > 256) {
          return Response.json({ ok: false, error: "Verification token is required" }, { status: 400 });
        }

        const name = "_aura-verify." + domain;
        const url = new URL("https://cloudflare-dns.com/dns-query");
        url.searchParams.set("name", name);
        url.searchParams.set("type", "TXT");

        const response = await fetch(url, {
          headers: { accept: "application/dns-json" },
          cache: "no-store",
        });
        if (!response.ok) {
          return Response.json({ ok: false, error: "DNS verification service unavailable" }, { status: 502 });
        }

        const payload = (await response.json()) as DnsResponse;
        const records = (payload.Answer ?? [])
          .map((answer) => answer.data?.replace(/^"|"$/g, ""))
          .filter((value): value is string => Boolean(value));

        const verified = records.includes(token);
        return Response.json({
          ok: verified,
          status: verified ? "verified" : "pending",
          error: verified ? undefined : "Verification TXT record not found",
        });
      },
    },
  },
});
