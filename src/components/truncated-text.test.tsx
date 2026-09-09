import { afterEach, expect, test, vi } from "vite-plus/test";

const truncation = vi.hoisted(() => ({ value: false }));

vi.mock("~/hooks/use-is-text-truncated", () => ({
  useIsTextTruncated: () => truncation.value,
}));

import { TruncatedText } from "~/components/truncated-text";
import { renderWithMantine } from "~/test-utils/render";

afterEach(() => {
  truncation.value = false;
});

test("TruncatedText はテキストを描画する", () => {
  const { getByText } = renderWithMantine(
    <TruncatedText lineClamp={1} size="sm">
      Distinction 2000
    </TruncatedText>,
  );

  expect(getByText("Distinction 2000")).toBeDefined();
});

test("省略された静的テキストはキーボードで Tooltip を開ける", () => {
  truncation.value = true;
  const { getByText } = renderWithMantine(
    <TruncatedText lineClamp={1}>長いテキスト</TruncatedText>,
  );

  expect(getByText("長いテキスト").getAttribute("tabindex")).toBe("0");
});
