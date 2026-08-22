import { Field, Form, useForm } from "@formisch/react";
import { Button, PasswordInput, SegmentedControl, Stack, TextInput } from "@mantine/core";
import { useState } from "react";

import { AuthActionFeedback } from "~/features/auth/components/auth-action-feedback";
import { useAuthActionTransition } from "~/features/auth/hooks/use-auth-action-transition";
import { useAuthPublicConfig } from "~/features/auth/hooks/use-auth-config";
import { signInWithAccount, signUpWithAccount } from "~/features/auth/lib/auth-actions";
import {
  AccountLoginSchema,
  AccountSignUpSchema,
  type AccountAuthMode,
} from "~/features/auth/schemas/account-auth-schema";

type AccountAuthFormProps = {
  mode: AccountAuthMode;
};

function AccountAuthForm({ mode }: AccountAuthFormProps) {
  const { isPending, result, run } = useAuthActionTransition();
  const loginForm = useForm({ schema: AccountLoginSchema });
  const signUpForm = useForm({ schema: AccountSignUpSchema });

  if (mode === "signUp") {
    return (
      <Form
        of={signUpForm}
        onSubmit={async (output) => {
          await run(() => signUpWithAccount(output));
        }}
      >
        <Stack gap="sm">
          <Field of={signUpForm} path={["username"]}>
            {(field) => (
              <TextInput
                {...field.props}
                autoComplete="username"
                error={field.errors?.[0]}
                label="ユーザー名"
                value={field.input}
              />
            )}
          </Field>
          <Field of={signUpForm} path={["name"]}>
            {(field) => (
              <TextInput
                {...field.props}
                autoComplete="name"
                error={field.errors?.[0]}
                label="表示名"
                value={field.input}
              />
            )}
          </Field>
          <Field of={signUpForm} path={["email"]}>
            {(field) => (
              <TextInput
                {...field.props}
                autoComplete="email"
                error={field.errors?.[0]}
                label="メールアドレス"
                type="email"
                value={field.input}
              />
            )}
          </Field>
          <Field of={signUpForm} path={["password"]}>
            {(field) => (
              <PasswordInput
                {...field.props}
                autoComplete="new-password"
                error={field.errors?.[0]}
                label="パスワード"
                value={field.input}
              />
            )}
          </Field>
          <AuthActionFeedback result={result} />
          <Button
            disabled={signUpForm.isSubmitting || isPending}
            fullWidth
            loading={signUpForm.isSubmitting || isPending}
            type="submit"
          >
            アカウントを作成
          </Button>
        </Stack>
      </Form>
    );
  }

  return (
    <Form
      of={loginForm}
      onSubmit={async (output) => {
        await run(() => signInWithAccount(output));
      }}
    >
      <Stack gap="sm">
        <Field of={loginForm} path={["identifier"]}>
          {(field) => (
            <TextInput
              {...field.props}
              autoComplete="username"
              error={field.errors?.[0]}
              label="ユーザー名またはメールアドレス"
              value={field.input}
            />
          )}
        </Field>
        <Field of={loginForm} path={["password"]}>
          {(field) => (
            <PasswordInput
              {...field.props}
              autoComplete="current-password"
              error={field.errors?.[0]}
              label="パスワード"
              value={field.input}
            />
          )}
        </Field>
        <AuthActionFeedback result={result} />
        <Button
          disabled={loginForm.isSubmitting || isPending}
          fullWidth
          loading={loginForm.isSubmitting || isPending}
          type="submit"
        >
          ログイン
        </Button>
      </Stack>
    </Form>
  );
}

type AccountAuthPanelProps = {
  initialMode?: AccountAuthMode;
};

export function AccountAuthPanel({ initialMode = "signIn" }: AccountAuthPanelProps) {
  const publicConfig = useAuthPublicConfig();
  const signUpEnabled = publicConfig.data?.signUpEnabled ?? true;
  const [mode, setMode] = useState<AccountAuthMode>(signUpEnabled ? initialMode : "signIn");

  if (!signUpEnabled) {
    return <AccountAuthForm mode="signIn" />;
  }

  return (
    <Stack gap="sm">
      <SegmentedControl
        data={[
          { label: "ログイン", value: "signIn" },
          { label: "新規登録", value: "signUp" },
        ]}
        fullWidth
        onChange={(value) => {
          setMode(value as AccountAuthMode);
        }}
        value={mode}
      />
      <AccountAuthForm key={mode} mode={mode} />
    </Stack>
  );
}
