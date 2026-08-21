import { Field, Form, useForm } from "@formisch/react";
import { Button, PasswordInput, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";

import {
  AccountLoginSchema,
  AccountSignUpSchema,
  isEmailAddress,
} from "~/features/auth/schemas/account-auth-schema";
import { authClient } from "~/lib/auth-client";

type AccountAuthFormProps = {
  mode: "signIn" | "signUp";
};

export function AccountAuthForm({ mode }: AccountAuthFormProps) {
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginForm = useForm({ schema: AccountLoginSchema });
  const signUpForm = useForm({ schema: AccountSignUpSchema });

  async function submitSignIn(identifier: string, password: string) {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = isEmailAddress(identifier)
        ? await authClient.signIn.email({ email: identifier, password })
        : await authClient.signIn.username({ username: identifier, password });
      if (result.error) {
        setErrorMessage(result.error.message ?? "ログインに失敗しました");
        return;
      }
      location.reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "ログインに失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitSignUp(email: string, name: string, password: string, username: string) {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await authClient.signUp.email({
        email,
        name,
        password,
        username,
      });
      if (result.error) {
        setErrorMessage(result.error.message ?? "登録に失敗しました");
        return;
      }
      location.reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (mode === "signUp") {
    return (
      <Form
        of={signUpForm}
        onSubmit={(output) => {
          void submitSignUp(output.email, output.name, output.password, output.username);
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
        void submitSignIn(output.identifier, output.password);
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
  initialMode?: "signIn" | "signUp";
};

export function AccountAuthPanel({ initialMode = "signIn" }: AccountAuthPanelProps) {
  const [mode, setMode] = useState<"signIn" | "signUp">(initialMode);

  return (
    <Stack gap="sm">
      <SegmentedControl
        data={[
          { label: "ログイン", value: "signIn" },
          { label: "新規登録", value: "signUp" },
        ]}
        fullWidth
        onChange={(value) => {
          setMode(value as "signIn" | "signUp");
        }}
        value={mode}
      />
      <AccountAuthForm key={mode} mode={mode} />
    </Stack>
  );
}
