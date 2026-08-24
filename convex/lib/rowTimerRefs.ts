import { makeFunctionReference } from "convex/server";

import type { Id } from "../_generated/dataModel";
import type { RunningTimerDto } from "./validators";

//! codegen(デプロイメント接続が必要)をこの環境で走らせられないため、#51 で追加した関数は名前で
//! 参照する(convex/goals.checkpointBackfill.test.ts と同じ前例)。codegen が走ったら
//! api.mutations.rows.* / api.queries.rows.* / internal.mutations.rows.* に置き換えて本ファイルを消す。
//? 参照の綴りを1箇所に集める。UI・cron・テストが同じ定数を使うので、パスの打ち間違いが散らない。

export const stopTimerRef = makeFunctionReference<"mutation", Record<"rowId", Id<"rows">>, number>(
  "mutations/rows/stopTimer:stopTimer",
);

export const resumeTimerRef = makeFunctionReference<"mutation", Record<"rowId", Id<"rows">>, null>(
  "mutations/rows/resumeTimer:resumeTimer",
);

export const runningTimerRef = makeFunctionReference<
  "query",
  Record<string, never>,
  RunningTimerDto | null
>("queries/rows/runningTimer:runningTimer");

//? 実体は internalMutation。cron からはこの1本だけを指す(CVX-05)。
export const autoStopTimersRef = makeFunctionReference<"mutation", { now?: number }, null>(
  "mutations/rows/autoStopTimers:autoStopTimers",
);
