import type { DayViewKind } from "~domain/dayView";

export function emptyDayCopy(kind: DayViewKind): { description: string; title: string } {
  if (kind === "unrecorded") {
    return {
      description: "まだ来ていない日です。記録は作れません。",
      title: "未記録",
    };
  }
  if (kind === "rest") {
    return {
      description: "この日に日はない。下から記録を足すか、昨日の確定をコピーすると日になる。",
      title: "休養",
    };
  }
  return {
    description: "下のフォームから、この日の記録を追加できます。",
    title: "この日の記録はありません",
  };
}
