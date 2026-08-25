import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { DayMetaPanel } from "~/features/today/components/day-meta-panel";
import { renderWithMantine } from "~/test-utils/render";

function panelProps(overrides: Partial<Parameters<typeof DayMetaPanel>[0]> = {}) {
  return {
    condition: null,
    memo: null,
    onSaveCondition: vi.fn(),
    onSaveMemo: vi.fn(),
    ...overrides,
  };
}

test("コンディションを選ぶと保存される", () => {
  const onSaveCondition = vi.fn();
  const { getByRole } = renderWithMantine(<DayMetaPanel {...panelProps({ onSaveCondition })} />);
  getByRole("radio", { name: "好調" }).click();
  expect(onSaveCondition).toHaveBeenCalledWith("好調");
});

test("メモを保存できる", async () => {
  const onSaveMemo = vi.fn();
  const { getByRole } = renderWithMantine(<DayMetaPanel {...panelProps({ onSaveMemo })} />);
  fireEvent.change(getByRole("textbox", { name: "メモ" }), { target: { value: "よく集中できた" } });
  getByRole("button", { name: "メモを保存" }).click();
  await waitFor(() => {
    expect(onSaveMemo).toHaveBeenCalledWith("よく集中できた");
  });
});

test("未編集(clean)のときはサーバーの memo 変更に追従する", () => {
  const { getByRole, rerender } = renderWithMantine(
    <DayMetaPanel {...panelProps({ memo: "朝の記録" })} />,
  );
  expect((getByRole("textbox", { name: "メモ" }) as HTMLTextAreaElement).value).toBe("朝の記録");

  rerender(<DayMetaPanel {...panelProps({ memo: "別端末からの更新" })} />);

  expect((getByRole("textbox", { name: "メモ" }) as HTMLTextAreaElement).value).toBe(
    "別端末からの更新",
  );
});

test("編集中(dirty)のときはサーバーの memo 変更で上書きしない", () => {
  const { getByRole, rerender } = renderWithMantine(
    <DayMetaPanel {...panelProps({ memo: "朝の記録" })} />,
  );
  fireEvent.change(getByRole("textbox", { name: "メモ" }), { target: { value: "編集中の内容" } });

  rerender(<DayMetaPanel {...panelProps({ memo: "別端末からの更新" })} />);

  expect((getByRole("textbox", { name: "メモ" }) as HTMLTextAreaElement).value).toBe(
    "編集中の内容",
  );
});
