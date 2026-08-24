import { Migrations } from "@convex-dev/migrations";
import type { ComponentApi } from "@convex-dev/migrations/_generated/component.js";
import { componentsGeneric } from "convex/server";

import type { DataModel } from "./_generated/dataModel";
import schema from "./schema";
import { backfillCheckpointParents as backfillForOwner } from "./services/goals/backfillCheckpointParents";

//? `convex codegen` はデプロイメント接続を要求するため、この作業環境では走らせられず、
//? _generated/api.d.ts の components に migrations が現れない(実行時の components は
//? _generated/api.js の componentsGeneric() そのものなので参照は同じもの)。codegen を
//? 通せる環境では `import { components } from "./_generated/api"` に戻す(#49 Phase 0 の宿題)。
const migrationsComponent: ComponentApi = componentsGeneric().migrations as unknown as ComponentApi;

export const migrations = new Migrations<DataModel, typeof schema>(migrationsComponent, {
  schema,
});

export const run = migrations.runner();

//* #49: 期限つき習得に親 FK を後付けする。所有者単位の規則なので、孤児を1件見つけたら
//? その所有者ぶんを一括で解決する。同一トランザクションの書き込みは同じバッチの後続の
//? migrateOne から見えるし、別バッチは再読込するので、残りの孤児は skip 側に落ちる。
//? parallelize は使わない(既定 off)。同じ所有者へ順序依存の書き込みをするため。
export const backfillCheckpointParents = migrations.define({
  migrateOne: async (ctx, goal) => {
    if (goal.type !== "mastery") {
      return;
    }
    if (goal.deadline === undefined) {
      return;
    }
    if (goal.parentGoalId !== undefined) {
      return;
    }
    await backfillForOwner(ctx, goal.ownerId);
  },
  table: "goals",
});

//* ロールバック用。親 FK を落とすだけで、昇格で外した期限は戻さない(#49 §9)。
export const revertCheckpointParents = migrations.define({
  migrateOne: (_ctx, goal) =>
    goal.type === "mastery" && goal.parentGoalId !== undefined
      ? { parentGoalId: undefined }
      : undefined,
  table: "goals",
});
