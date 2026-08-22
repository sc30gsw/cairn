import type { AuthActionResult } from "~/lib/auth-action-result";
import { authActionErrorMessage } from "~/lib/auth-action-result";

export async function submitAuthAction(
  action: () => Promise<AuthActionResult>,
  setErrorMessage: (message: null | string) => void,
): Promise<void> {
  setErrorMessage(null);
  const message = authActionErrorMessage(await action());
  if (message !== null) {
    setErrorMessage(message);
  }
}
