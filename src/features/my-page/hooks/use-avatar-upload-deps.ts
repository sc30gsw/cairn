import { useMutation } from "convex/react";

import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";

export function useAvatarUploadDeps() {
  const generateUploadUrl = useMutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
  );
  const claimAvatarUpload = useMutation(api.mutations.profile.claimAvatarUpload.claimAvatarUpload);

  return {
    claimAvatarUpload: async (args: {
      claimId: Id<"avatarUploadClaims">;
      storageId: Id<"_storage">;
    }) => {
      await claimAvatarUpload(args);
    },
    generateUploadUrl: () => generateUploadUrl({}),
  };
}
