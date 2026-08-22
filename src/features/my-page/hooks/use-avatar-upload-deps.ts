import { useMutation } from "convex/react";
import { useConvex } from "convex/react";

import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";

export function useAvatarUploadDeps() {
  const convex = useConvex();
  const generateUploadUrl = useMutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
  );
  const claimAvatarUpload = useMutation(api.mutations.profile.claimAvatarUpload.claimAvatarUpload);

  return {
    claimAvatarUpload: async (storageId: Id<"_storage">) => {
      await claimAvatarUpload({ storageId });
    },
    generateUploadUrl: () => generateUploadUrl({}),
    getAvatarUrl: (storageId: Id<"_storage">) =>
      convex.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId }),
  };
}
