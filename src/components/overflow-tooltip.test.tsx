import { act, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vite-plus/test";

vi.mock("~/hooks/use-is-text-truncated", () => ({
  useIsTextTruncated: () => true,
}));

import { OverflowTooltip } from "~/components/overflow-tooltip";
import { renderWithMantine } from "~/test-utils/render";

const TOOLTIP_TRANSITION_MS = 200;

afterEach(async () => {
  cleanup();
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, TOOLTIP_TRANSITION_MS);
    });
  });
});

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

test("省略された操作要素はタップで全文を表示する", async () => {
  const view = renderWithMantine(
    <OverflowTooltip<HTMLButtonElement> content="省略された全文">
      {(ref) => (
        <button ref={ref} type="button">
          省略表示
        </button>
      )}
    </OverflowTooltip>,
  );
  const target = view.getByRole("button", { name: "省略表示" });

  fireEvent.pointerDown(target, { pointerType: "touch" });
  fireEvent.mouseEnter(target);

  expect((await view.findByRole("tooltip")).textContent).toContain("省略された全文");
});
