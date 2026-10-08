import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Magic Moments — Painel interno" },
      {
        name: "description",
        content:
          "Painel interno da Magic Moments para gestão de clientes, eventos, serviços e equipe.",
      },
      { property: "og:title", content: "Magic Moments — Painel interno" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        property: "og:description",
        content: "Sistema interno de gestão de eventos da Magic Moments.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
