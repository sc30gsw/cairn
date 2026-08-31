import { expect, test } from "vite-plus/test";

import { deriveReviewMonth, deriveReviewWeek } from "~/features/review/hooks/use-review-view";

test("deriveReviewWeek は未指定時に今週の月曜を返す", () => {
  expect(deriveReviewWeek({}, "2026-08-20")).toBe("2026-08-17");
});

test("deriveReviewWeek は月曜以外を渡されてもその週の月曜に正規化する", () => {
  expect(deriveReviewWeek({ week: "2026-08-22" }, "2026-08-31")).toBe("2026-08-17");
  expect(deriveReviewWeek({ week: "2026-08-23" }, "2026-08-31")).toBe("2026-08-17");
});

test("deriveReviewWeek は未来週を今週にクランプする", () => {
  expect(deriveReviewWeek({ week: "2026-09-07" }, "2026-08-20")).toBe("2026-08-17");
});

test("deriveReviewWeek は過去週をそのまま返す", () => {
  expect(deriveReviewWeek({ week: "2026-08-10" }, "2026-08-20")).toBe("2026-08-10");
});

test("deriveReviewMonth は未指定時に今月、未来月は今月にクランプする", () => {
  expect(deriveReviewMonth({}, "2026-08-20")).toBe("2026-08");
  expect(deriveReviewMonth({ month: "2026-09" }, "2026-08-20")).toBe("2026-08");
  expect(deriveReviewMonth({ month: "2026-07" }, "2026-08-20")).toBe("2026-07");
});
