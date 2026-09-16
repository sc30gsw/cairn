import { fireEvent, waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { expect, test, vi } from "vite-plus/test";

import { AdhocRowForm } from "~/features/today/components/adhoc-row-form";
import { MutationFailedError } from "~/lib/errors";
import { renderWithMantine } from "~/test-utils/render";

const ITEMS = [
  { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
];

const NOTE = "残るはず";

test("記録を足すとひとことと分数が初期値に戻る", async () => {
  const onAdd = vi.fn(async () => Result.ok(null));
  const { getByRole } = renderWithMantine(<AdhocRowForm items={ITEMS} onAdd={onAdd} />);
  fireEvent.change(getByRole("textbox", { name: "その日限りのひとこと" }), {
    target: { value: NOTE },
  });
  fireEvent.change(getByRole("textbox", { name: "分数" }), { target: { value: "45" } });
  fireEvent.click(getByRole("button", { name: "記録を足す" }));

  await waitFor(() => {
    expect(onAdd).toHaveBeenCalledWith({
      content: NOTE,
      itemId: "i1",
      minutes: 45,
    });
  });
  expect((getByRole("textbox", { name: "その日限りのひとこと" }) as HTMLInputElement).value).toBe(
    "",
  );
  expect((getByRole("textbox", { name: "分数" }) as HTMLInputElement).value).toBe("20");
});

test("記録の追加失敗ではひとことを消さない", async () => {
  const onAdd = vi.fn(async () =>
    Result.err(new MutationFailedError({ cause: new Error("offline"), message: "保存失敗" })),
  );
  const { getByRole } = renderWithMantine(<AdhocRowForm items={ITEMS} onAdd={onAdd} />);
  fireEvent.change(getByRole("textbox", { name: "その日限りのひとこと" }), {
    target: { value: NOTE },
  });
  fireEvent.click(getByRole("button", { name: "記録を足す" }));

  await waitFor(() => expect(onAdd).toHaveBeenCalledOnce());
  expect((getByRole("textbox", { name: "その日限りのひとこと" }) as HTMLInputElement).value).toBe(
    NOTE,
  );
});
