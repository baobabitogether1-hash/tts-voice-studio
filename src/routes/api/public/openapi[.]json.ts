import { createFileRoute } from "@tanstack/react-router";
import { openApiSpec } from "@/lib/openapi";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export const Route = createFileRoute("/api/public/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) =>
        Response.json(
          {
            ...openApiSpec,
            servers: [{ url: new URL(request.url).origin, description: "This Speak API deployment" }],
          },
          { headers: CORS },
        ),
    },
  },
});
