export type RecordStatus = "スキップ" | "未着手" | "確定";

export const RECORD_STATUS_UI = {
  スキップ: { color: "yellow", label: "見送り" },
  未着手: { color: "gray", label: "未着手" },
  確定: { color: "blue", label: "完了" },
} as const satisfies Record<RecordStatus, { color: string; label: string }>;

export function recordStatusLabel(status: RecordStatus): string {
  return RECORD_STATUS_UI[status].label;
}
