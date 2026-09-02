import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import schema from "./schema";
import {
  CALENDAR_FEED_NOT_FOUND_BODY,
  calendarFeedResponse,
} from "./services/calendarFeed/respond";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
  "!./auth.ts",
  "!./betterAuth/**",
  "!./convex.config.ts",
  "!./crons.ts",
  "!./http.ts",
  "!./migrations.ts",
]);

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const OTHER = { email: "other@example.com", subject: "other-subject" };
const NOW = Date.UTC(2026, 8, 2, 0, 0, 0);

function raw() {
  return convexTest(schema, modules);
}

test("購読 URL は発行・再発行・停止でき、所有者ごとに1本", async () => {
  const t = raw();
  const owner = t.withIdentity(OWNER);
  expect(await owner.query(api.queries.calendarFeed.status.status, {})).toEqual({ token: null });

  const first = await owner.mutation(api.mutations.calendarFeed.issue.issue, {});
  expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(await owner.query(api.queries.calendarFeed.status.status, {})).toEqual({ token: first });

  const second = await owner.mutation(api.mutations.calendarFeed.issue.issue, {});
  expect(second).not.toBe(first);
  expect(await t.run(async (ctx) => ctx.db.query("calendarFeedTokens").collect())).toHaveLength(1);
  //? 古いトークンは即 404、新しいトークンだけが通る
  expect(
    await t.query(internal.queries.calendarFeed.feedByToken.feedByToken, { token: first }),
  ).toBeNull();
  expect(
    await t.query(internal.queries.calendarFeed.feedByToken.feedByToken, { token: second }),
  ).toEqual({ events: [] });

  await owner.mutation(api.mutations.calendarFeed.revoke.revoke, {});
  expect(await owner.query(api.queries.calendarFeed.status.status, {})).toEqual({ token: null });
  expect(
    await t.query(internal.queries.calendarFeed.feedByToken.feedByToken, { token: second }),
  ).toBeNull();
});

test("フィードには進行中の本番日と未達成のチェックポイント期限だけが、日付順に載る", async () => {
  const t = raw();
  const owner = t.withIdentity(OWNER);
  const other = t.withIdentity(OTHER);
  const examId = await owner.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "TOEIC 本番",
      examDate: "2026-11-15",
      maxScore: 900,
      minScore: 800,
      type: "exam",
    },
  });
  await owner.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "Unit 1-10 を音読",
      criterion: "止まらずに読める",
      deadline: "2026-09-30",
      parentGoalId: examId,
      type: "mastery",
    },
  });
  const achievedId = await owner.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "達成済みの刻み",
      criterion: "できる",
      deadline: "2026-09-10",
      parentGoalId: examId,
      type: "mastery",
    },
  });
  await owner.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: "2026-09-01",
    goalId: achievedId,
  });
  await owner.mutation(api.mutations.goals.create.create, {
    goal: { content: "期限のない長期目標", criterion: "できる", type: "mastery" },
  });
  await other.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "他人の本番",
      examDate: "2026-10-01",
      maxScore: 900,
      minScore: 800,
      type: "exam",
    },
  });
  const token = await owner.mutation(api.mutations.calendarFeed.issue.issue, {});

  const feed = await t.query(internal.queries.calendarFeed.feedByToken.feedByToken, { token });

  expect(feed?.events.map((event) => [event.dateJst, event.summary, event.description])).toEqual([
    ["2026-09-30", "期限: Unit 1-10 を音読", "TOEIC 本番 / 止まらずに読める"],
    ["2026-11-15", "本番: TOEIC 本番", "目標 800〜900"],
  ]);

  //? 結果を入れて終了した本番は載らない
  await owner.mutation(api.mutations.goals.setExamResult.setExamResult, {
    goalId: examId,
    result: { recordedAt: "2026-11-30", score: 855 },
  });
  const after = await t.query(internal.queries.calendarFeed.feedByToken.feedByToken, { token });
  expect(after?.events.map((event) => event.summary)).toEqual(["期限: Unit 1-10 を音読"]);
});

test("応答: 有効なら text/calendar の ICS、無効なら 404", async () => {
  const ok = calendarFeedResponse(
    { events: [{ dateJst: "2026-11-15", summary: "本番: TOEIC", uid: "goal-exam" }] },
    NOW,
  );
  expect(ok.status).toBe(200);
  expect(ok.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
  const body = await ok.text();
  expect(body).toContain("BEGIN:VCALENDAR");
  expect(body).toContain("DTSTART;VALUE=DATE:20261115");

  const notFound = calendarFeedResponse(null, NOW);
  expect(notFound.status).toBe(404);
  expect(await notFound.text()).toBe(CALENDAR_FEED_NOT_FOUND_BODY);
  expect(notFound.headers.get("cache-control")).toBe("no-store");
});
