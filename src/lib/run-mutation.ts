import { Result } from "better-result";

import { MutationFailedError } from "~/lib/errors";
import { notifyError, notifySuccess } from "~/lib/notify";

type RunMutationOptions = {
  errorMessage?: string;
  successMessage?: string;
};

export async function runMutation<T>(
  operation: () => Promise<T>,
  { errorMessage, successMessage }: RunMutationOptions = {},
): Promise<void> {
  const result = await Result.tryPromise({
    catch: (cause) =>
      new MutationFailedError({ cause, message: errorMessage ?? "操作に失敗しました" }),
    try: operation,
  });

  if (Result.isError(result)) {
    notifyError(result.error.cause, result.error.message);
    return;
  }

  if (successMessage) {
    notifySuccess(successMessage);
  }
}
