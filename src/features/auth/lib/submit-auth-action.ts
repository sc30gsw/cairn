import type { ActionResult } from "~/lib/run-auth-action";

export async function submitAuthAction(
  action: () => Promise<ActionResult>,
  setErrorMessage: (message: null | string) => void,
): Promise<void> {
  setErrorMessage(null);
  const result = await action();
  if (result.errorMessage !== null) {
    setErrorMessage(result.errorMessage);
  }
}
