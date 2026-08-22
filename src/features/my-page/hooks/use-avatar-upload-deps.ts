import { useMutation } from "convex/react";
import { useConvex } from "convex/react";

import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";

export function useAvatarUploadDeps() {
  const convex = useConvex();
  const generateUploadUrl = useMutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
  );

  return {
    generateUploadUrl: () => generateUploadUrl({}),
    getAvatarUrl: (storageId: Id<"_storage">) =>
      convex.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId }),
  };
}
