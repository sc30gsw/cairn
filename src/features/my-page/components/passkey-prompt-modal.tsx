import { Button, Group, Modal, Stack, Text } from "@mantine/core";

import { addPasskey } from "~/features/my-page/lib/profile-actions";
import {
  PASSKEY_MYPAGE_REPROMPTED_KEY,
  PASSKEY_SIGNUP_SKIPPED_KEY,
  writePasskeyFlag,
} from "~/features/onboarding/lib/onboarding-storage";

type PasskeyPromptModalProps = {
  context: "mypage" | "signup";
  onClose: () => void;
  opened: boolean;
};

export function PasskeyPromptModal({ context, onClose, opened }: PasskeyPromptModalProps) {
  async function handleAdd() {
    const result = await addPasskey("Cairn");
    if (result.errorMessage === null) {
      writePasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY, false);
      onClose();
    }
  }

  function handleSkip() {
    if (context === "signup") {
      writePasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY, true);
    }
    if (context === "mypage") {
      writePasskeyFlag(PASSKEY_MYPAGE_REPROMPTED_KEY, true);
    }
    onClose();
  }

  return (
    <Modal onClose={handleSkip} opened={opened} title="パスキーを登録しますか？">
      <Stack gap="md">
        <Text size="sm">
          次回からパスワードの代わりに、端末の生体認証で素早くログインできます。スキップしてもあとからマイページで追加できます。
        </Text>
        <Group justify="flex-end">
          <Button onClick={handleSkip} type="button" variant="default">
            あとで
          </Button>
          <Button onClick={() => void handleAdd()} type="button">
            パスキーを追加
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
