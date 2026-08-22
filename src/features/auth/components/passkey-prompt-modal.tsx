import { Form, useForm } from "@formisch/react";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useState } from "react";

import {
  PASSKEY_MYPAGE_REPROMPTED_KEY,
  PASSKEY_SIGNUP_SKIPPED_KEY,
  writePasskeyFlag,
} from "~/lib/passkey-storage";
import { addPasskey } from "~/lib/profile-actions";
import { PASSKEY_DEFAULT_DEVICE_NAME, PasskeyAddSchema } from "~/lib/validation/passkey-schema";

type PasskeyPromptModalProps = {
  context: "mypage" | "signup";
  onClose: () => void;
  opened: boolean;
};

export function PasskeyPromptModal({ context, onClose, opened }: PasskeyPromptModalProps) {
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const form = useForm({
    initialInput: { name: PASSKEY_DEFAULT_DEVICE_NAME },
    schema: PasskeyAddSchema,
  });

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
      <Form
        of={form}
        onSubmit={async (output) => {
          setErrorMessage(null);
          const result = await addPasskey(output);
          if (result.errorMessage !== null) {
            setErrorMessage(result.errorMessage);
            return;
          }
          writePasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY, false);
          onClose();
        }}
      >
        <Stack gap="md">
          <Text size="sm">
            次回からパスワードの代わりに、端末の生体認証で素早くログインできます。スキップしてもあとからマイページで追加できます。
          </Text>
          {errorMessage ? (
            <Text c="red" size="sm">
              {errorMessage}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button onClick={handleSkip} type="button" variant="default">
              あとで
            </Button>
            <Button disabled={form.isSubmitting} loading={form.isSubmitting} type="submit">
              パスキーを追加
            </Button>
          </Group>
        </Stack>
      </Form>
    </Modal>
  );
}
