import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "~/features/legal/components/legal-page";
import { PRIVACY_POLICY } from "~/features/legal/content/privacy-policy";

export const Route = createFileRoute("/privacy")({
  component: PrivacyRoute,
  head: () => ({ meta: [{ title: `${PRIVACY_POLICY.title} | 学習ログ` }] }),
});

function PrivacyRoute() {
  return <LegalPage document={PRIVACY_POLICY} />;
}
