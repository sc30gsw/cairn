import type { Passkey } from "@better-auth/passkey/client";
import { Result } from "better-result";
import { useState } from "react";

import { PasskeyPromptModal } from "~/components/passkey-prompt-modal";
import type { AuthActionError } from "~/lib/errors";
import {
  shouldOpenMyPagePasskeyPrompt,
  shouldShowMyPagePasskeyPrompt,
} from "~/lib/passkey-storage";
import { listPasskeys } from "~/lib/profile-actions";
import { useResultTransition } from "~/lib/use-result-transition";

export function MyPagePasskeyReprompt() {
  const [opened, setOpened] = useState(false);
  useResultTransition<Passkey[], AuthActionError>({
    initialAction: shouldOpenMyPagePasskeyPrompt() ? repromptIfNoPasskeys : undefined,
  });

  async function repromptIfNoPasskeys() {
    const result = await listPasskeys();
    if (Result.isOk(result) && shouldShowMyPagePasskeyPrompt(result.value.length > 0)) {
      setOpened(true);
    }
    return result;
  }

  return <PasskeyPromptModal context="mypage" onClose={() => setOpened(false)} opened={opened} />;
}
