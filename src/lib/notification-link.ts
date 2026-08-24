import type { NotificationKind } from "~domain/notifications";

//? ルート文字列は UI の関心なので convex/lib には置かない。
//? weeklyTargetMiss は週次レビュー(#52)へ送る — 未達を直すのに必要な数字がそこに揃っている。
export const NOTIFICATION_LINKS = {
  checkpointDeadline: "/goals",
  eveningUntouched: "/",
  weeklyTargetMiss: "/review",
} as const satisfies Record<NotificationKind, string>;

export function notificationLink(kind: NotificationKind): string {
  return NOTIFICATION_LINKS[kind];
}
