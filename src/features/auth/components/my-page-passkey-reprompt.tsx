import type { Passkey } from "@better-auth/passkey/client";
import { Result } from "better-result";
import { useEffect, useState } from "react";

import { PasskeyPromptModal } from "~/features/auth/components/passkey-prompt-modal";
import type { AuthActionError } from "~/lib/errors";
import {
  shouldOpenMyPagePasskeyPrompt,
  shouldShowMyPagePasskeyPrompt,
} from "~/lib/passkey-storage";
import { listPasskeys } from "~/lib/profile-actions";
import { useResultTransition } from "~/lib/use-result-transition";

export function MyPagePasskeyReprompt() {
  const list = useResultTransition<Passkey[], AuthActionError>();
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!shouldOpenMyPagePasskeyPrompt()) {
      return;
    }

    void list.run(async () => {
      const result = await listPasskeys();
      if (Result.isOk(result) && shouldShowMyPagePasskeyPrompt(result.value.length > 0)) {
        setOpened(true);
      }
      return result;
    });
    // Mount-only passkey gate; storage flags are read synchronously on first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  return <PasskeyPromptModal context="mypage" onClose={() => setOpened(false)} opened={opened} />;
}
