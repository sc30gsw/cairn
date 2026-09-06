import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "~/features/legal/components/legal-page";
import { TERMS_OF_SERVICE } from "~/features/legal/content/terms-of-service";

export const Route = createFileRoute("/terms")({
  component: TermsRoute,
  head: () => ({ meta: [{ title: `${TERMS_OF_SERVICE.title} | 学習ログ` }] }),
});

function TermsRoute() {
  return <LegalPage document={TERMS_OF_SERVICE} />;
}
