import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { dayBoardTestRow } from "~/features/today/components/day-board.test-fixtures";
import { RowEditor } from "~/features/today/components/row-editor";
import type { DayRow } from "~/features/today/types/day";
import { REVIEW_STOP_LABEL, reviewBadgeLabel, reviewIntervalLabel } from "~/lib/review-ui";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("~/components/concrete-action-field-with-suggestions", () => ({
  ConcreteActionFieldWithSuggestions: ({ label, value }: { label: string; value: string }) => (
    <input aria-label={label} readOnly value={value} />
  ),
}));

const TODAY = "2026-08-17";

const CONFIRMED_ROW = {
  ...dayBoardTestRow,
  content: "Unit 1 を音読",
  status: "確定",
} satisfies DayRow;

function editorProps(row: DayRow) {
  return {
    onConfirm: vi.fn(),
    onFlagReview: vi.fn(),
    onRemove: vi.fn(),
    onSkip: vi.fn(),
    onUnflagReview: vi.fn(),
    onUnskip: vi.fn(),
    row,
    todayJst: TODAY,
  };
}

const reviewButtonName = `${CONFIRMED_ROW.itemName}を復習に回す`;

test("確定した記録には復習の導線があり、期日を選ぶと onFlagReview に日付が渡る", async () => {
  const props = editorProps(CONFIRMED_ROW);
  const { getByRole } = renderWithMantine(<RowEditor {...props} />);

  fireEvent.click(getByRole("button", { name: reviewButtonName }));
  await waitFor(() => {
    expect(getByRole("menuitem", { hidden: true, name: reviewIntervalLabel(3) })).toBeDefined();
  });
  fireEvent.click(getByRole("menuitem", { hidden: true, name: reviewIntervalLabel(3) }));

  expect(props.onFlagReview).toHaveBeenCalledWith({
    dueJst: "2026-08-20",
    rowId: CONFIRMED_ROW._id,
  });
});

test("印の付いた記録は期日つきのバッジを出し、「復習をやめる」で onUnflagReview が呼ばれる", async () => {
  const review = { dueJst: "2026-08-18", kind: "source", stage: 0 } as const;
  const props = editorProps({ ...CONFIRMED_ROW, review });
  const { getByRole, getByText, queryByRole } = renderWithMantine(<RowEditor {...props} />);

  expect(getByText(reviewBadgeLabel(review))).toBeDefined();
  fireEvent.click(getByRole("button", { name: reviewButtonName }));
  await waitFor(() => {
    expect(getByRole("menuitem", { hidden: true, name: REVIEW_STOP_LABEL })).toBeDefined();
  });
  fireEvent.click(getByRole("menuitem", { hidden: true, name: REVIEW_STOP_LABEL }));

  expect(props.onUnflagReview).toHaveBeenCalledWith(CONFIRMED_ROW._id);
  expect(queryByRole("menuitem", { hidden: true, name: reviewIntervalLabel(99) })).toBeNull();
});

test("復習の記録そのものは何回目かを出し、印を付ける導線は出さない", () => {
  const review = { kind: "review", stage: 1 } as const;
  const props = editorProps({ ...CONFIRMED_ROW, review });
  const { getByText, queryByRole } = renderWithMantine(<RowEditor {...props} />);

  expect(getByText(reviewBadgeLabel(review))).toBeDefined();
  expect(queryByRole("button", { name: reviewButtonName })).toBeNull();
});

test("未着手の記録には復習の導線を出さない", () => {
  const props = editorProps(dayBoardTestRow);
  const { queryByRole } = renderWithMantine(<RowEditor {...props} />);
  expect(queryByRole("button", { name: `${dayBoardTestRow.itemName}を復習に回す` })).toBeNull();
});
