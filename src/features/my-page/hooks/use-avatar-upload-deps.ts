import { api } from "~/../convex/_generated/api";
import type { AvatarUploadDependencies } from "~/features/my-page/lib/avatar-upload";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useAvatarUploadDeps() {
  const generateUploadUrl = useConvexMutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
  );
  const claimAvatarUpload = useConvexMutation(
    api.mutations.profile.claimAvatarUpload.claimAvatarUpload,
  );

  return {
    claimAvatarUpload,
    generateUploadUrl: () => generateUploadUrl({}),
  } satisfies AvatarUploadDependencies;
}
