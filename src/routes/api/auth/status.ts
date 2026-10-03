import { createFileRoute } from "@tanstack/react-router";
import { getAuthConfigurationStatus } from "@/services/auth/authStatus";

export const Route = createFileRoute("/api/auth/status")({
  server: {
    handlers: {
      GET: async ({ context }) => {
        return Response.json(getAuthConfigurationStatus(context.env), {
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});
