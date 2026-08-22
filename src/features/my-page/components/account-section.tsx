import { Field, Form, reset, useForm } from "@formisch/react";
import { Button, Card, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useState, useTransition } from "react";

import { useAppShellUser } from "~/features/auth/hooks/use-auth-session";
import { authActionErrorMessage } from "~/lib/auth-action-result";
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

function ProfileNameForm() {
  const user = useAppShellUser();
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [successMessage, setSuccessMessage] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    initialInput: { name: user?.name ?? "" },
    schema: ProfileNameSchema,
  });

  if (user === null) {
    return null;
  }

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        setErrorMessage(null);
        setSuccessMessage(null);
        startTransition(() => {
          void updateProfileName(output).then((result) => {
            const message = authActionErrorMessage(result);
            if (message !== null) {
              setErrorMessage(message);
              return;
            }
            setSuccessMessage("表示名を保存しました");
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

function ProfileUsernameForm() {
  const user = useAppShellUser();
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [successMessage, setSuccessMessage] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    initialInput: { username: user?.username ?? "" },
    schema: ProfileUsernameSchema,
  });

  if (user === null) {
    return null;
  }

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        setErrorMessage(null);
        setSuccessMessage(null);
        startTransition(() => {
          void updateProfileUsername(output).then((result) => {
            const message = authActionErrorMessage(result);
            if (message !== null) {
              setErrorMessage(message);
              return;
            }
            setSuccessMessage("ユーザー名を保存しました");
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
        setErrorMessage(null);
        setSuccessMessage(null);
        startTransition(() => {
          void updateProfilePassword(output).then((result) => {
            const message = authActionErrorMessage(result);
            if (message !== null) {
              setErrorMessage(message);
              return;
            }
            reset(form, { initialInput: emptyPasswordInput, keepInput: false });
            setSuccessMessage("パスワードを変更しました");
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
        <ProfileNameForm key={user.name ?? ""} />
        <ProfileUsernameForm key={user.username ?? ""} />
        <ProfilePasswordForm />
      </Stack>
    </Card>
  );
}
