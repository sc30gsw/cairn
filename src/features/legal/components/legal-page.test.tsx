import { expect, test } from "vite-plus/test";

import { LegalPage } from "~/features/legal/components/legal-page";
import { PRIVACY_POLICY } from "~/features/legal/content/privacy-policy";
import { TERMS_OF_SERVICE } from "~/features/legal/content/terms-of-service";
import { renderWithMantine } from "~/test-utils/render";

test("プライバシーポリシーは Google ユーザーデータの Limited Use と連絡先を含む", () => {
  const { getByRole } = renderWithMantine(<LegalPage document={PRIVACY_POLICY} />);
  expect(getByRole("heading", { level: 1, name: "プライバシーポリシー" })).toBeDefined();
  expect(getByRole("heading", { level: 2, name: /Limited Use/ })).toBeDefined();
  expect(
    getByRole("link", { name: /Google API Services User Data Policy/ }).getAttribute("href"),
  ).toBe("https://developers.google.com/terms/api-services-user-data-policy");
  expect(getByRole("link", { name: /連絡先/ })).toBeDefined();
});

test("利用規約は Google カレンダー連携が双方向に影響することを説明する", () => {
  const { getByRole, getByText } = renderWithMantine(<LegalPage document={TERMS_OF_SERVICE} />);
  expect(getByRole("heading", { level: 1, name: "利用規約" })).toBeDefined();
  expect(getByText(/双方向に影響する/)).toBeDefined();
  expect(getByRole("link", { name: /学習ログへ戻る/ })).toBeDefined();
});
