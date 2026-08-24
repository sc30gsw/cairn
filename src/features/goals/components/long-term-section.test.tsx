import { expect, test, vi } from "vite-plus/test";

import {
  LONG_TERM_ADD_LABEL,
  LONG_TERM_EMPTY_MESSAGE,
  LONG_TERM_HINT,
  LONG_TERM_SECTION_TITLE,
  LongTermSection,
} from "~/features/goals/components/long-term-section";
import { renderWithMantine } from "~/test-utils/render";

function sectionProps(overrides: Partial<Parameters<typeof LongTermSection>[0]> = {}) {
  return {
    form: undefined,
    groups: [],
    onAdd: vi.fn(),
    ...overrides,
  } satisfies Parameters<typeof LongTermSection>[0];
}

test("0件でも見出し・説明・追加導線と薄字1行を出す", () => {
  const { getByRole, getByText } = renderWithMantine(<LongTermSection {...sectionProps()} />);
  expect(getByRole("region", { name: LONG_TERM_SECTION_TITLE })).toBeDefined();
  expect(getByText(LONG_TERM_HINT)).toBeDefined();
  expect(getByText(LONG_TERM_EMPTY_MESSAGE)).toBeDefined();
  expect(getByRole("button", { name: LONG_TERM_ADD_LABEL })).toBeDefined();
});

test("親カードがあれば薄字1行は出さない", () => {
  const { getByText, queryByText } = renderWithMantine(
    <LongTermSection {...sectionProps({ groups: [<div key="group">親カード</div>] })} />,
  );
  expect(getByText("親カード")).toBeDefined();
  expect(queryByText(LONG_TERM_EMPTY_MESSAGE)).toBeNull();
});

test("長期目標が増えると薄字1行から親カードに切り替わる(再描画)", () => {
  const view = renderWithMantine(<LongTermSection {...sectionProps()} />);
  expect(view.getByText(LONG_TERM_EMPTY_MESSAGE)).toBeDefined();

  view.rerender(
    <LongTermSection {...sectionProps({ groups: [<div key="group">親カード</div>] })} />,
  );

  expect(view.queryByText(LONG_TERM_EMPTY_MESSAGE)).toBeNull();
  expect(view.getByText("親カード")).toBeDefined();
});

test("フォームを開いている間は追加導線を出さない", () => {
  const { getByText, queryByRole } = renderWithMantine(
    <LongTermSection {...sectionProps({ form: <div>新規フォーム</div>, onAdd: undefined })} />,
  );
  expect(getByText("新規フォーム")).toBeDefined();
  expect(queryByRole("button", { name: LONG_TERM_ADD_LABEL })).toBeNull();
});

test("追加ボタンで onAdd が呼ばれる", () => {
  const onAdd = vi.fn();
  const { getByRole } = renderWithMantine(<LongTermSection {...sectionProps({ onAdd })} />);
  getByRole("button", { name: LONG_TERM_ADD_LABEL }).click();
  expect(onAdd).toHaveBeenCalledOnce();
});
