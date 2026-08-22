import { Text } from "@mantine/core";
import { Result } from "better-result";

import type { AuthActionResult } from "~/lib/auth-action-result";

type AuthActionFeedbackProps = {
  result: AuthActionResult | null;
  successMessage?: string;
};

export function AuthActionFeedback({ result, successMessage }: AuthActionFeedbackProps) {
  if (result === null) {
    return null;
  }

  if (Result.isError(result)) {
    return (
      <Text c="red" size="sm">
        {result.error.message}
      </Text>
    );
  }

  if (successMessage === undefined) {
    return null;
  }

  return (
    <Text c="green" size="sm">
      {successMessage}
    </Text>
  );
}
