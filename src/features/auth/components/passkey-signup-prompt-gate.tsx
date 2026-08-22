import { useEffect, useState } from "react";

import { PasskeyPromptModal } from "~/features/my-page/components/passkey-prompt-modal";
import {
  PASSKEY_SIGNUP_PROMPT_KEY,
  readPasskeyFlag,
  writePasskeyFlag,
} from "~/features/onboarding/lib/onboarding-storage";

export function PasskeySignupPromptGate() {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)) {
      setOpened(true);
      writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, false);
    }
  }, []);

  return <PasskeyPromptModal context="signup" onClose={() => setOpened(false)} opened={opened} />;
}
