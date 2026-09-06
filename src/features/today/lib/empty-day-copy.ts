import type { DayPage } from "~/features/today/types/day";

const EMPTY_DAY_COPY = {
  beforeRegistration: {
    title: "利用開始前",
    description: "利用開始前の日です。下のフォームから、この日の記録も追加できます。",
  },
  live: {
    description: "下のフォームから、この日の記録を追加できます。",
    title: "この日の記録はありません",
  },
  rest: {
    description: "この日に日はない。下から記録を足すか、昨日の確定をコピーすると日になる。",
    title: "休養",
  },
  todayEmpty: {
    description: "下のフォームから、この日の記録を追加できます。",
    title: "この日の記録はありません",
  },
  unrecorded: {
    description: "まだ来ていない日です。記録は作れません。",
    title: "未記録",
  },
} as const satisfies Record<DayPage["kind"], { description: string; title: string }>;

export function emptyDayCopy(kind: DayPage["kind"]): { description: string; title: string } {
  return EMPTY_DAY_COPY[kind];
}
