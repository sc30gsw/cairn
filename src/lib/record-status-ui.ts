import type { Status } from "~domain/domain";

type StatusUi = {
  color: string;
  label: string;
};

export const RECORD_STATUS_UI = {
  スキップ: { color: "yellow", label: "見送り" },
  未着手: { color: "gray", label: "未着手" },
  確定: { color: "green", label: "完了" },
  進行中: { color: "blue", label: "進行中" },
} as const satisfies Record<Status, StatusUi>;

const TRASH_STATUS_LABEL = {
  スキップ: "やってない",
  未着手: "未着手",
  確定: "やった",
  進行中: "進行中",
} as const satisfies Record<Status, string>;

export function trashStatusLabel(status: Status): string {
  return TRASH_STATUS_LABEL[status];
}

export function statusTooltip(status: Status): string {
  if (status === "未着手") {
    return "まだ決めていない";
  }
  if (status === "進行中") {
    return "取り組み中";
  }
  if (status === "スキップ") {
    return "見送り";
  }
  return "完了";
}
