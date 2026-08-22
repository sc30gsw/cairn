import { useState } from "react";

import { PasskeyPromptModal } from "~/components/passkey-prompt-modal";
import { consumeSignupPasskeyPromptOpen } from "~/lib/passkey-storage";

export function PasskeySignupPromptGate() {
  const [opened, setOpened] = useState(consumeSignupPasskeyPromptOpen);

  return <PasskeyPromptModal context="signup" onClose={() => setOpened(false)} opened={opened} />;
}
