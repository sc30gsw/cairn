import { useMutation } from "convex/react";

import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";

export function useAvatarUploadDeps() {
  const generateUploadUrl = useMutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
  );
  const getAvatarUrl = useMutation(api.mutations.profile.getAvatarUrl.getAvatarUrl);

  return {
    generateUploadUrl: () => generateUploadUrl({}),
    getAvatarUrl: (storageId: Id<"_storage">) => getAvatarUrl({ storageId }),
  };
}
