import { useEffect, useState } from "react";

import { PasskeyPromptModal } from "~/components/passkey-prompt-modal";
import {
  consumeSignupPasskeyPromptFlags,
  shouldOpenSignupPasskeyPrompt,
} from "~/lib/passkey-storage";

export function PasskeySignupPromptGate() {
  const [opened, setOpened] = useState(shouldOpenSignupPasskeyPrompt);

  useEffect(() => {
    consumeSignupPasskeyPromptFlags();
  }, []);

  return <PasskeyPromptModal context="signup" onClose={() => setOpened(false)} opened={opened} />;
}
