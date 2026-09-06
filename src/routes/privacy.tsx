import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "~/features/legal/components/legal-page";
import { PRIVACY_POLICY } from "~/features/legal/content/privacy-policy";

//? ログイン不要。Google の OAuth 同意画面のブランディングに載せるプライバシーポリシー
export const Route = createFileRoute("/privacy")({
  component: PrivacyRoute,
  head: () => ({ meta: [{ title: `${PRIVACY_POLICY.title} | 学習ログ` }] }),
});

function PrivacyRoute() {
  return <LegalPage document={PRIVACY_POLICY} />;
}
