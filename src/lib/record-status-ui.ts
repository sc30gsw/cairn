import type { Status } from "~domain/domain";

export type StatusUi = {
  color: string;
  label: string;
};

export const RECORD_STATUS_UI = {
  スキップ: { color: "yellow", label: "見送り" },
  未着手: { color: "gray", label: "未着手" },
  確定: { color: "blue", label: "完了" },
} as const satisfies Record<Status, StatusUi>;

export const TRASH_STATUS_LABEL = {
  スキップ: "やってない",
  未着手: "未着手",
  確定: "やった",
} as const satisfies Record<Status, string>;

export function recordStatusLabel(status: Status): string {
  return RECORD_STATUS_UI[status].label;
}

export function trashStatusLabel(status: Status): string {
  return TRASH_STATUS_LABEL[status];
}

export function statusTooltip(status: Status): string {
  if (status === "未着手") {
    return "まだ決めていない";
  }
  if (status === "スキップ") {
    return "見送り";
  }
  return "完了";
}
