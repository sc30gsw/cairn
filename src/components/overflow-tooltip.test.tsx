import { fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

vi.mock("~/hooks/use-is-text-truncated", () => ({
  useIsTextTruncated: () => true,
}));

import { OverflowTooltip } from "~/components/overflow-tooltip";
import { renderWithMantine } from "~/test-utils/render";

test("省略された操作要素はホバーで全文を表示する", async () => {
  const view = renderWithMantine(
    <OverflowTooltip<HTMLButtonElement> content="省略された全文">
      {(ref) => (
        <button ref={ref} type="button">
          省略表示
        </button>
      )}
    </OverflowTooltip>,
  );

  fireEvent.mouseEnter(view.getByRole("button", { name: "省略表示" }));

  expect((await view.findByRole("tooltip")).textContent).toContain("省略された全文");
});
