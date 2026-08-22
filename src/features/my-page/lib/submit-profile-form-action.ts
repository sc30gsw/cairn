import type { ProfileActionResult } from "~/lib/profile-actions";

export async function submitProfileFormAction(
  action: () => Promise<ProfileActionResult>,
  handlers: {
    onError: (message: string) => void;
    onStart: () => void;
    onSuccess: () => void;
  },
): Promise<void> {
  handlers.onStart();
  const result = await action();
  if (result.errorMessage !== null) {
    handlers.onError(result.errorMessage);
    return;
  }
  handlers.onSuccess();
}
