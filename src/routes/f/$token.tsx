import { createFileRoute } from "@tanstack/react-router";
import { IntakePage } from "@/routes/pre-cadastro";
import { intakeTokenSchema } from "@/lib/intake-links";

export const Route = createFileRoute("/f/$token")({
  head: () => ({ meta: [
    { title: "Sua ficha de contrato — Magic Moments" },
    { name: "description", content: "Preencha sua ficha pessoal para preparação do contrato com a Magic Moments." },
    { property: "og:title", content: "Sua ficha de contrato — Magic Moments" },
    { property: "og:description", content: "Ficha pessoal e segura para contratação da Magic Moments." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
    { name: "referrer", content: "no-referrer" },
  ] }),
  component: ShortIntakePage,
});
function ShortIntakePage() {
  const params = Route.useParams();
  const parsed = intakeTokenSchema.safeParse(params.token);
  return <IntakePage token={parsed.success ? parsed.data : ""} />;
}