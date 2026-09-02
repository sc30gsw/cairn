import { Menu } from "@mantine/core";
import { IconRepeat, IconRepeatOff } from "@tabler/icons-react";
import { addDaysJst, type DateJst } from "~domain/jst";
import { REVIEW_INTERVAL_DAYS } from "~domain/review";
import type { RowReviewDto } from "~domain/validators";

import { REVIEW_MENU_LABEL, REVIEW_STOP_LABEL, reviewIntervalLabel } from "~/lib/review-ui";

type ReviewMenuItemsProps = {
  onFlag: (dueJst: DateJst) => void;
  onUnflag: () => void;
  review: RowReviewDto;
  status: string;
  todayJst: DateJst;
};

//? 印を付ける・期日を選び直す・やめる。確定した記録にだけ出し、復習の記録そのものには出さない
export function ReviewMenuItems({
  onFlag,
  onUnflag,
  review,
  status,
  todayJst,
}: ReviewMenuItemsProps) {
  if (status !== "確定" || review?.kind === "review") {
    return null;
  }
  return (
    <>
      <Menu.Divider />
      <Menu.Label>{REVIEW_MENU_LABEL}</Menu.Label>
      {REVIEW_INTERVAL_DAYS.map((days) => {
        const dueJst = addDaysJst(todayJst, days);
        return (
          <Menu.Item
            disabled={review?.dueJst === dueJst}
            key={days}
            leftSection={<IconRepeat aria-hidden size={16} stroke={1.5} />}
            onClick={() => onFlag(dueJst)}
          >
            {reviewIntervalLabel(days)}
          </Menu.Item>
        );
      })}
      {review !== null && (
        <Menu.Item
          color="red"
          leftSection={<IconRepeatOff aria-hidden size={16} stroke={1.5} />}
          onClick={onUnflag}
        >
          {REVIEW_STOP_LABEL}
        </Menu.Item>
      )}
    </>
  );
}
