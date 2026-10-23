import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LOVABLE_CRON_SECRET"];
        const token = request.headers.get("x-cron-secret");
        if (!secret || !token || token !== secret)
          return new Response("Unauthorized", { status: 401 });
        const { runBackup } = await import("@/lib/backup.server");
        const result = await runBackup("scheduled", null);
        return Response.json({ status: result.status });
      },
    },
  },
});
