import type { MutationCtx } from "../../_generated/server";
import { ensureCatalog } from "./ensureCatalog";

export async function ensure(ctx: MutationCtx, ownerId: string): Promise<null> {
  await ensureCatalog(ctx, ownerId);
  return null;
}
