import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useAvatarUploadDeps() {
  const generateUploadUrl = useConvexMutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
  );
  const claimAvatarUpload = useConvexMutation(
    api.mutations.profile.claimAvatarUpload.claimAvatarUpload,
  );

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
