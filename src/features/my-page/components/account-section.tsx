import { Field, Form, useForm } from "@formisch/react";
import { Button, Card, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useState } from "react";

import {
  updateProfileName,
  updateProfilePassword,
  updateProfileUsername,
} from "~/features/my-page/lib/profile-actions";
import {
  ProfileNameSchema,
  ProfilePasswordSchema,
  ProfileUsernameSchema,
} from "~/features/my-page/schemas/profile-schema";
import type { AppShellUser } from "~/types/session";

type AccountSectionProps = {
  user: AppShellUser;
};

function ProfileNameForm({ initialName }: { initialName: string }) {
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const form = useForm({
    initialInput: { name: initialName },
    schema: ProfileNameSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={async (output) => {
        setErrorMessage(null);
        const result = await updateProfileName(output);
        if (result.errorMessage !== null) {
          setErrorMessage(result.errorMessage);
        }
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
        <Button disabled={form.isSubmitting} loading={form.isSubmitting} size="xs" type="submit">
          表示名を保存
        </Button>
      </Stack>
    </Form>
  );
}

function ProfileUsernameForm({ initialUsername }: { initialUsername: string }) {
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const form = useForm({
    initialInput: { username: initialUsername },
    schema: ProfileUsernameSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={async (output) => {
        setErrorMessage(null);
        const result = await updateProfileUsername(output);
        if (result.errorMessage !== null) {
          setErrorMessage(result.errorMessage);
        }
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
        <Button disabled={form.isSubmitting} loading={form.isSubmitting} size="xs" type="submit">
          ユーザー名を保存
        </Button>
      </Stack>
    </Form>
  );
}

function ProfilePasswordForm() {
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const form = useForm({
    initialInput: { currentPassword: "", newPassword: "" },
    schema: ProfilePasswordSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={async (output) => {
        setErrorMessage(null);
        const result = await updateProfilePassword(output);
        if (result.errorMessage !== null) {
          setErrorMessage(result.errorMessage);
        }
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
        <Button disabled={form.isSubmitting} loading={form.isSubmitting} size="xs" type="submit">
          パスワードを変更
        </Button>
      </Stack>
    </Form>
  );
}

export function AccountSection({ user }: AccountSectionProps) {
  return (
    <Card padding="md">
      <Stack gap="lg">
        <Title order={3}>アカウント</Title>
        <ProfileNameForm initialName={user.name ?? ""} />
        <ProfileUsernameForm initialUsername={user.username ?? ""} />
        <ProfilePasswordForm />
      </Stack>
    </Card>
  );
}
