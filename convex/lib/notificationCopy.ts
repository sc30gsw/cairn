import { TARGET_METRIC_UNITS } from "./domain";
import { NOTIFICATION_BODY_LINE_LIMIT } from "./notifications";
import type { NotificationPayload } from "./validators";

function joinLines(lines: readonly string[]): string {
  if (lines.length <= NOTIFICATION_BODY_LINE_LIMIT) {
    return lines.join("\n");
  }
  const shown = lines.slice(0, NOTIFICATION_BODY_LINE_LIMIT);
  return [...shown, `…他${String(lines.length - NOTIFICATION_BODY_LINE_LIMIT)}件`].join("\n");
}

export function notificationMessage(payload: NotificationPayload): {
  body: string;
  title: string;
} {
  switch (payload.kind) {
    case "checkpointDeadline":
      return {
        body: joinLines(
          payload.items.map(
            (item) =>
              `・${item.content}（${item.daysLeft === 0 ? "今日まで" : `あと${String(item.daysLeft)}日`} / ${item.deadline}）`,
          ),
        ),
        title: "チェックポイントの期限が近づいています",
      };
    case "weeklyTargetMiss":
      return {
        body: joinLines(
          payload.shortfalls.map(
            (shortfall) =>
              `・${shortfall.categoryName} あと${String(shortfall.targetValue - shortfall.current)}${TARGET_METRIC_UNITS[shortfall.metric]}`,
          ),
        ),
        title: "今週の週間ターゲットが未達です",
      };
    default:
      return {
        body:
          payload.source === "day"
            ? `未着手が${String(payload.pendingCount)}件残っています。`
            : `今日はまだ開いていません。今日のプリセットに${String(payload.pendingCount)}件あります。`,
        title: "今日の残りがあります",
      };
  }
}
