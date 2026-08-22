import { expect, test } from "vite-plus/test";

import { TruncatedText } from "~/components/truncated-text";
import { renderWithMantine } from "~/test-utils/render";

test("TruncatedText はテキストを描画する", () => {
  const { getByText } = renderWithMantine(
    <TruncatedText lineClamp={1} size="sm">
      Distinction 2000
    </TruncatedText>,
  );

  expect(getByText("Distinction 2000")).toBeDefined();
});
