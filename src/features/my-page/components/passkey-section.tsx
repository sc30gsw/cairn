import type { Passkey } from "@better-auth/passkey/client";
import { Field, Form, useForm } from "@formisch/react";
import { Button, Card, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { Result } from "better-result";
import { useEffect, useState } from "react";

import { AuthActionFeedback } from "~/features/auth/components/auth-action-feedback";
import { useAuthActionTransition } from "~/features/auth/hooks/use-auth-action-transition";
import { addPasskey, deletePasskey, listPasskeys } from "~/features/auth/lib/profile-actions";
import type { AuthActionError } from "~/lib/errors";
import { useResultTransition } from "~/lib/use-result-transition";
import { PASSKEY_DEFAULT_DEVICE_NAME, PasskeyAddSchema } from "~/lib/validation/passkey-schema";

export function PasskeySection() {
  const list = useResultTransition<Passkey[], AuthActionError>();
  const addAction = useAuthActionTransition();
  const deleteAction = useAuthActionTransition();
  const [deletingId, setDeletingId] = useState<null | string>(null);
  const form = useForm({
    initialInput: { name: PASSKEY_DEFAULT_DEVICE_NAME },
    schema: PasskeyAddSchema,
  });

  const passkeys = list.result !== null && Result.isOk(list.result) ? list.result.value : [];
  const isListLoading = list.isPending && list.result === null;
  const listErrorMessage =
    list.result !== null && Result.isError(list.result) ? list.result.error.message : null;

  useEffect(() => {
    void list.run(() => listPasskeys());
    // Mount-only passkey list load; `list.run` is stable enough for a single fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  async function refreshPasskeys() {
    await list.run(() => listPasskeys());
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const next = await deleteAction.run(() => deletePasskey(id));
    setDeletingId(null);
    if (Result.isOk(next)) {
      await refreshPasskeys();
    }
  }

  return (
    <Card padding="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>パスキー</Title>
          <Form
            of={form}
            onSubmit={async (output) => {
              const next = await addAction.run(() => addPasskey(output));
              if (Result.isOk(next)) {
                await refreshPasskeys();
              }
            }}
          >
            <Stack gap="sm">
              <Field of={form} path={["name"]}>
                {(field) => (
                  <TextInput
                    {...field.props}
                    error={field.errors?.[0]}
                    label="デバイス名"
                    placeholder={PASSKEY_DEFAULT_DEVICE_NAME}
                    size="xs"
                    value={field.input}
                  />
                )}
              </Field>
              <Button
                disabled={form.isSubmitting || addAction.isPending}
                loading={form.isSubmitting || addAction.isPending}
                size="xs"
                type="submit"
              >
                パスキーを追加
              </Button>
            </Stack>
          </Form>
        </Group>
        <Text c="dimmed" size="sm">
          パスワードの代わりに端末の生体認証でログインできます。
        </Text>
        {isListLoading ? <Text size="sm">読み込み中…</Text> : null}
        {listErrorMessage ? (
          <Text c="red" size="sm">
            {listErrorMessage}
          </Text>
        ) : null}
        {!isListLoading && passkeys.length === 0 ? (
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
              loading={deletingId === passkey.id}
              onClick={() => void handleDelete(passkey.id)}
              size="xs"
              type="button"
              variant="light"
            >
              削除
            </Button>
          </Group>
        ))}
        <AuthActionFeedback result={addAction.result} successMessage="パスキーを追加しました" />
        <AuthActionFeedback result={deleteAction.result} successMessage="パスキーを削除しました" />
      </Stack>
    </Card>
  );
}
