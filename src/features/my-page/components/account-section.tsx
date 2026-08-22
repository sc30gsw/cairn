import { Field, Form, reset, useForm } from "@formisch/react";
import { Button, Card, PasswordInput, Stack, TextInput, Title } from "@mantine/core";
import { Result } from "better-result";

import { AuthActionFeedback } from "~/features/auth/components/auth-action-feedback";
import { useAuthActionTransition } from "~/features/auth/hooks/use-auth-action-transition";
import { useAppShellUser } from "~/features/auth/hooks/use-auth-session";
import {
  updateProfileName,
  updateProfilePassword,
  updateProfileUsername,
} from "~/features/auth/lib/profile-actions";
import {
  ProfileNameSchema,
  ProfilePasswordSchema,
  ProfileUsernameSchema,
} from "~/lib/validation/profile-schema";

const emptyPasswordInput = { currentPassword: "", newPassword: "" } as const;

function ProfileNameForm({ name }: { name: string }) {
  const { isPending, result, run } = useAuthActionTransition();
  const form = useForm({ initialInput: { name }, schema: ProfileNameSchema });

  return (
    <Form
      of={form}
      onSubmit={async (output) => {
        await run(() => updateProfileName(output));
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
        <AuthActionFeedback result={result} successMessage="表示名を保存しました" />
        <Button
          disabled={form.isSubmitting || isPending}
          loading={form.isSubmitting || isPending}
          size="xs"
          type="submit"
        >
          表示名を保存
        </Button>
      </Stack>
    </Form>
  );
}

function ProfileUsernameForm({ username }: { username: string }) {
  const { isPending, result, run } = useAuthActionTransition();
  const form = useForm({ initialInput: { username }, schema: ProfileUsernameSchema });

  return (
    <Form
      of={form}
      onSubmit={async (output) => {
        await run(() => updateProfileUsername(output));
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
        <AuthActionFeedback result={result} successMessage="ユーザー名を保存しました" />
        <Button
          disabled={form.isSubmitting || isPending}
          loading={form.isSubmitting || isPending}
          size="xs"
          type="submit"
        >
          ユーザー名を保存
        </Button>
      </Stack>
    </Form>
  );
}

function ProfilePasswordForm() {
  const { isPending, result, run } = useAuthActionTransition();
  const form = useForm({ initialInput: emptyPasswordInput, schema: ProfilePasswordSchema });

  return (
    <Form
      of={form}
      onSubmit={async (output) => {
        const next = await run(() => updateProfilePassword(output));
        if (Result.isOk(next)) {
          reset(form, { initialInput: emptyPasswordInput, keepInput: false });
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
        <AuthActionFeedback result={result} successMessage="パスワードを変更しました" />
        <Button
          disabled={form.isSubmitting || isPending}
          loading={form.isSubmitting || isPending}
          size="xs"
          type="submit"
        >
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
        <ProfileNameForm key={user.name ?? ""} name={user.name ?? ""} />
        <ProfileUsernameForm key={user.username ?? ""} username={user.username ?? ""} />
        <ProfilePasswordForm />
      </Stack>
    </Card>
  );
}
