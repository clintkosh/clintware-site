import { createFileRoute } from "@tanstack/react-router";
import { probeN7ControlPlane } from "@/lib/n7/backend-health.server";

export const Route = createFileRoute("/internal-health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await probeN7ControlPlane();
          return Response.json({
            ok: true,
            service: "n7-customer-value-os",
            controlPlane: "ready",
            revision: result.revision,
            state: result.state,
            ai: result.ai,
            audio: result.audio,
            jira: result.jira,
          });
        } catch (error) {
          return Response.json(
            {
              ok: false,
              service: "n7-customer-value-os",
              controlPlane: "unavailable",
              error: error instanceof Error ? error.message : "backend_probe_failed",
            },
            { status: 503 },
          );
        }
      },
    },
  },
});
