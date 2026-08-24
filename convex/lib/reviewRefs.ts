import { makeFunctionReference } from "convex/server";

import type { MonthlyReviewDto, WeeklyReviewDto } from "./validators";

//! codegen(デプロイメント接続が必要)をこの環境で走らせられないため、#52/#54 で追加した関数は名前で
//! 参照する(convex/lib/rowTimerRefs.ts と同じ前例)。codegen が走ったら
//! api.queries.review.* に置き換えて本ファイルを消す。
//? 参照の綴りを1箇所に集める。画面とテストが同じ定数を使うので、パスの打ち間違いが散らない。

export const weeklyReviewRef = makeFunctionReference<
  "query",
  { todayJst: string; weekStartJst: string },
  WeeklyReviewDto
>("queries/review/weeklyReview:weeklyReview");

export const monthlyReviewRef = makeFunctionReference<
  "query",
  { todayJst: string; yearMonth: string },
  MonthlyReviewDto
>("queries/review/monthlyReview:monthlyReview");
