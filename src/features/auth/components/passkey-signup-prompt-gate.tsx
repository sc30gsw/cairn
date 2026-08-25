import { useEffect, useState } from "react";

import { PasskeyPromptModal } from "~/components/passkey-prompt-modal";
import {
  consumeSignupPasskeyPromptFlags,
  shouldOpenSignupPasskeyPrompt,
} from "~/lib/passkey-storage";

export function PasskeySignupPromptGate() {
  const [opened, setOpened] = useState(shouldOpenSignupPasskeyPrompt);

  //? 一回限りのフラグ消費は commit 後の effect で行う(render 中の書き込みは discard された
  //? render でも消費してしまい、フラグを取りこぼす)
  useEffect(() => {
    consumeSignupPasskeyPromptFlags();
  }, []);

  return <PasskeyPromptModal context="signup" onClose={() => setOpened(false)} opened={opened} />;
}
