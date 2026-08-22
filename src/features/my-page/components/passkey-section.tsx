import type { Passkey } from "@better-auth/passkey/client";
import { Form, useForm } from "@formisch/react";
import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Result } from "better-result";
import { useEffect, useState, useTransition } from "react";

import { authActionErrorMessage } from "~/lib/auth-action-result";
import { addPasskey, deletePasskey, listPasskeys } from "~/lib/profile-actions";
import { PASSKEY_DEFAULT_DEVICE_NAME, PasskeyAddSchema } from "~/lib/validation/passkey-schema";

export function PasskeySection() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [successMessage, setSuccessMessage] = useState<null | string>(null);
  const [isListPending, startListTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<null | string>(null);
  const form = useForm({
    initialInput: { name: PASSKEY_DEFAULT_DEVICE_NAME },
    schema: PasskeyAddSchema,
  });

  function applyPasskeyList(result: Awaited<ReturnType<typeof listPasskeys>>) {
    if (Result.isError(result)) {
      setErrorMessage(result.error.message);
      setPasskeys([]);
      return;
    }
    setErrorMessage(null);
    setPasskeys(result.value);
  }

  function refreshPasskeys() {
    startListTransition(() => {
      void listPasskeys().then(applyPasskeyList);
    });
  }

  function clearFeedback() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  useEffect(() => {
    let cancelled = false;

    startListTransition(() => {
      void listPasskeys().then((result) => {
        if (cancelled) {
          return;
        }
        applyPasskeyList(result);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [startListTransition]);

  function handleDelete(id: string) {
    setDeletingId(id);
    clearFeedback();
    startDeleteTransition(() => {
      void deletePasskey(id).then(async (result) => {
        setDeletingId(null);
        const message = authActionErrorMessage(result);
        if (message !== null) {
          setErrorMessage(message);
          return;
        }
        setSuccessMessage("パスキーを削除しました");
        applyPasskeyList(await listPasskeys());
      });
    });
  }

  return (
    <Card padding="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>パスキー</Title>
          <Form
            of={form}
            onSubmit={async (output) => {
              clearFeedback();
              const result = await addPasskey(output);
              const message = authActionErrorMessage(result);
              if (message !== null) {
                setErrorMessage(message);
                return;
              }
              setSuccessMessage("パスキーを追加しました");
              refreshPasskeys();
            }}
          >
            <Button
              disabled={form.isSubmitting}
              loading={form.isSubmitting}
              size="xs"
              type="submit"
            >
              パスキーを追加
            </Button>
          </Form>
        </Group>
        <Text c="dimmed" size="sm">
          パスワードの代わりに端末の生体認証でログインできます。
        </Text>
        {isListPending ? <Text size="sm">読み込み中…</Text> : null}
        {!isListPending && passkeys.length === 0 ? (
          <Text c="dimmed" size="sm">
            登録済みのパスキーはありません。
          </Text>
        ) : null}
        {passkeys.map((passkey) => (
          <Group justify="space-between" key={passkey.id} wrap="nowrap">
            <Stack gap={0}>
              <Text size="sm">{passkey.name ?? "パスキー"}</Text>
              {passkey.deviceType ? (
                <Text c="dimmed" size="xs">
                  {passkey.deviceType}
                </Text>
              ) : null}
            </Stack>
            <Button
              color="red"
              loading={isDeletePending && deletingId === passkey.id}
              onClick={() => handleDelete(passkey.id)}
              size="xs"
              type="button"
              variant="light"
            >
              削除
            </Button>
          </Group>
        ))}
        {errorMessage ? (
          <Text c="red" size="sm">
            {errorMessage}
          </Text>
        ) : null}
        {successMessage ? (
          <Text c="green" size="sm">
            {successMessage}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
