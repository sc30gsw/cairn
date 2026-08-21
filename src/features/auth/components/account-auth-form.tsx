import { Field, Form, useForm } from "@formisch/react";
import { Button, PasswordInput, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";

import { useAuthActions } from "~/features/auth/hooks/use-auth-actions";
import {
  AccountLoginSchema,
  AccountSignUpSchema,
  type AccountAuthMode,
} from "~/features/auth/schemas/account-auth-schema";

type AccountAuthFormProps = {
  mode: AccountAuthMode;
};

export function AccountAuthForm({ mode }: AccountAuthFormProps) {
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithAccount, signUpWithAccount } = useAuthActions();
  const loginForm = useForm({ schema: AccountLoginSchema });
  const signUpForm = useForm({ schema: AccountSignUpSchema });

  if (mode === "signUp") {
    return (
      <Form
        of={signUpForm}
        onSubmit={(output) => {
          setErrorMessage(null);
          setIsSubmitting(true);
          void signUpWithAccount(output)
            .then((result) => {
              if (result.errorMessage !== null) {
                setErrorMessage(result.errorMessage);
              }
            })
            .catch((error: unknown) => {
              setErrorMessage(error instanceof Error ? error.message : "登録に失敗しました");
            })
            .finally(() => {
              setIsSubmitting(false);
            });
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
          {errorMessage ? (
            <Text c="red" size="sm">
              {errorMessage}
            </Text>
          ) : null}
          <Button disabled={isSubmitting} fullWidth loading={isSubmitting} type="submit">
            アカウントを作成
          </Button>
        </Stack>
      </Form>
    );
  }

  return (
    <Form
      of={loginForm}
      onSubmit={(output) => {
        setErrorMessage(null);
        setIsSubmitting(true);
        void signInWithAccount(output)
          .then((result) => {
            if (result.errorMessage !== null) {
              setErrorMessage(result.errorMessage);
            }
          })
          .catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "ログインに失敗しました");
          })
          .finally(() => {
            setIsSubmitting(false);
          });
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
        {errorMessage ? (
          <Text c="red" size="sm">
            {errorMessage}
          </Text>
        ) : null}
        <Button disabled={isSubmitting} fullWidth loading={isSubmitting} type="submit">
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
  const [mode, setMode] = useState<AccountAuthMode>(initialMode);

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
