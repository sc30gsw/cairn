import { expect, test } from "vite-plus/test";
import { DAY_VIEW_KINDS } from "~domain/dayView";

import { emptyDayCopy } from "~/features/today/lib/empty-day-copy";

test("emptyDayCopy はすべての kind の題を返す", () => {
  const titles = {
    live: "この日の記録はありません",
    rest: "休養",
    todayEmpty: "この日の記録はありません",
    unrecorded: "未記録",
  } as const satisfies Record<(typeof DAY_VIEW_KINDS)[number], string>;

  for (const kind of DAY_VIEW_KINDS) {
    expect(emptyDayCopy(kind).title).toBe(titles[kind]);
  }
});
