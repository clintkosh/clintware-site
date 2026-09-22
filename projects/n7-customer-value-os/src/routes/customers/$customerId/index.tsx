import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/customers/$customerId/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/customers/$customerId/$section",
      params: { customerId: params.customerId, section: "executive-summary" },
    });
  },
});