import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "~/features/legal/components/legal-page";
import { TERMS_OF_SERVICE } from "~/features/legal/content/terms-of-service";

//? ログイン不要。Google の OAuth 同意画面のブランディングに載せる利用規約
export const Route = createFileRoute("/terms")({
  component: TermsRoute,
  head: () => ({ meta: [{ title: `${TERMS_OF_SERVICE.title} | 学習ログ` }] }),
});

function TermsRoute() {
  return <LegalPage document={TERMS_OF_SERVICE} />;
}
