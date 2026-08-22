import { Field, Form, reset, useForm } from "@formisch/react";
import { Button, Card, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useState, useTransition } from "react";

import { submitProfileFormAction } from "~/features/my-page/lib/submit-profile-form-action";
import { useAppShellUser } from "~/hooks/use-auth-session";
import {
  updateProfileName,
  updateProfilePassword,
  updateProfileUsername,
} from "~/lib/profile-actions";
import {
  ProfileNameSchema,
  ProfilePasswordSchema,
  ProfileUsernameSchema,
} from "~/lib/validation/profile-schema";

function ProfileNameForm({ initialName }: { initialName: string }) {
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [successMessage, setSuccessMessage] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    initialInput: { name: initialName },
    schema: ProfileNameSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        startTransition(() => {
          void submitProfileFormAction(() => updateProfileName(output), {
            onError: setErrorMessage,
            onStart: () => {
              setErrorMessage(null);
              setSuccessMessage(null);
            },
            onSuccess: () => setSuccessMessage("表示名を保存しました"),
          });
        });
      }}
    >
      <Stack gap="sm">
        <Field of={form} path={["name"]}>
          {(field) => (
            <TextInput
              {...field.props}
              error={field.errors?.[0]}
              label="表示名"
              value={field.input}
            />
          )}
        </Field>
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
        <Button disabled={isPending} loading={isPending} size="xs" type="submit">
          表示名を保存
        </Button>
      </Stack>
    </Form>
  );
}

function ProfileUsernameForm({ initialUsername }: { initialUsername: string }) {
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [successMessage, setSuccessMessage] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    initialInput: { username: initialUsername },
    schema: ProfileUsernameSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        startTransition(() => {
          void submitProfileFormAction(() => updateProfileUsername(output), {
            onError: setErrorMessage,
            onStart: () => {
              setErrorMessage(null);
              setSuccessMessage(null);
            },
            onSuccess: () => setSuccessMessage("ユーザー名を保存しました"),
          });
        });
      }}
    >
      <Stack gap="sm">
        <Field of={form} path={["username"]}>
          {(field) => (
            <TextInput
              {...field.props}
              error={field.errors?.[0]}
              label="ユーザー名"
              value={field.input}
            />
          )}
        </Field>
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
        <Button disabled={isPending} loading={isPending} size="xs" type="submit">
          ユーザー名を保存
        </Button>
      </Stack>
    </Form>
  );
}

const emptyPasswordInput = { currentPassword: "", newPassword: "" } as const;

function ProfilePasswordForm() {
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [successMessage, setSuccessMessage] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    initialInput: emptyPasswordInput,
    schema: ProfilePasswordSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        startTransition(() => {
          void submitProfileFormAction(() => updateProfilePassword(output), {
            onError: setErrorMessage,
            onStart: () => {
              setErrorMessage(null);
              setSuccessMessage(null);
            },
            onSuccess: () => {
              reset(form, { initialInput: emptyPasswordInput, keepInput: false });
              setSuccessMessage("パスワードを変更しました");
            },
          });
        });
      }}
    >
      <Stack gap="sm">
        <Field of={form} path={["currentPassword"]}>
          {(field) => (
            <PasswordInput
              {...field.props}
              autoComplete="current-password"
              error={field.errors?.[0]}
              label="現在のパスワード"
              value={field.input}
            />
          )}
        </Field>
        <Field of={form} path={["newPassword"]}>
          {(field) => (
            <PasswordInput
              {...field.props}
              autoComplete="new-password"
              error={field.errors?.[0]}
              label="新しいパスワード"
              value={field.input}
            />
          )}
        </Field>
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
        <Button disabled={isPending} loading={isPending} size="xs" type="submit">
          パスワードを変更
        </Button>
      </Stack>
    </Form>
  );
}

export function AccountSection() {
  const user = useAppShellUser();

  if (user === null) {
    return null;
  }

  return (
    <Card padding="md">
      <Stack gap="lg">
        <Title order={3}>アカウント</Title>
        <ProfileNameForm initialName={user.name ?? ""} key={user.name ?? ""} />
        <ProfileUsernameForm initialUsername={user.username ?? ""} key={user.username ?? ""} />
        <ProfilePasswordForm />
      </Stack>
    </Card>
  );
}
