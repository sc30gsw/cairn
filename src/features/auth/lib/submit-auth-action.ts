import type { AuthActionResult } from "~/features/auth/lib/auth-actions";

export async function submitAuthAction(
  action: () => Promise<AuthActionResult>,
  setErrorMessage: (message: null | string) => void,
): Promise<void> {
  setErrorMessage(null);
  const result = await action();
  if (result.errorMessage !== null) {
    setErrorMessage(result.errorMessage);
  }
}
