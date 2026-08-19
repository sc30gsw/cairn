import { expect, test } from "vite-plus/test";

import { emptyDayCopy } from "~/features/today/lib/empty-day-copy";

test("空状態のコピーは休養・未記録・通常で分かれる", () => {
  expect(emptyDayCopy("rest").title).toBe("休養");
  expect(emptyDayCopy("unrecorded").title).toBe("未記録");
  expect(emptyDayCopy("todayEmpty").title).toBe("この日の記録はありません");
  expect(emptyDayCopy("live").title).toBe("この日の記録はありません");
});
