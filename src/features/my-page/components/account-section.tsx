import { Field, reset, useForm } from "@formisch/react";
import { Card, PasswordInput, Stack, TextInput, Title } from "@mantine/core";
import { Result } from "better-result";

import { ProfileAccountActionForm } from "~/features/my-page/components/profile-account-action-form";
import { useMyPageUser } from "~/features/my-page/hooks/use-my-page-user";
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

const emptyPasswordInput = { currentPassword: "", newPassword: "" } as const;

function ProfileNameForm({ name }: { name: string }) {
  const form = useForm({ initialInput: { name }, schema: ProfileNameSchema });

  return (
    <ProfileAccountActionForm
      form={form}
      onSubmit={updateProfileName}
      submitLabel="表示名を保存"
      successMessage="表示名を保存しました"
    >
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
    </ProfileAccountActionForm>
  );
}

function ProfileUsernameForm({ username }: { username: string }) {
  const form = useForm({ initialInput: { username }, schema: ProfileUsernameSchema });

  return (
    <ProfileAccountActionForm
      form={form}
      onSubmit={updateProfileUsername}
      submitLabel="ユーザー名を保存"
      successMessage="ユーザー名を保存しました"
    >
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
    </ProfileAccountActionForm>
  );
}

function ProfilePasswordForm() {
  const form = useForm({ initialInput: emptyPasswordInput, schema: ProfilePasswordSchema });

  return (
    <ProfileAccountActionForm
      form={form}
      onSubmit={updateProfilePassword}
      onSuccess={(result) => {
        if (Result.isOk(result)) {
          reset(form, { initialInput: emptyPasswordInput, keepInput: false });
        }
      }}
      submitLabel="パスワードを変更"
      successMessage="パスワードを変更しました"
    >
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
    </ProfileAccountActionForm>
  );
}

export function AccountSection() {
  const user = useMyPageUser();

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
