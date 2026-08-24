import migrations from "@convex-dev/migrations/convex.config";
import { defineApp } from "convex/server";

import betterAuth from "./betterAuth/convex.config";

const app = defineApp();
app.use(betterAuth);
//? スキーマ移行の実行状態・カーソル・失敗バッチを記録する(#49 Phase 0)。
app.use(migrations);

export default app;
