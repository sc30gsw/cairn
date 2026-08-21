import { Field, Form, getInput, useForm, validate } from "@formisch/react";
import { Button, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";

import { DevLoginSchema } from "~/features/auth/schemas/dev-login-schema";
import { authClient } from "~/lib/auth-client";

type DevEmailLoginFormProps = {
  allowedEmailHint?: string;
};

export function DevEmailLoginForm({ allowedEmailHint }: DevEmailLoginFormProps) {
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginForm = useForm({ schema: DevLoginSchema });

  async function submitEmailAuth(mode: "signIn" | "signUp", email: string, password: string) {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result =
        mode === "signIn"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: "Owner" });
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

  return (
    <Form
      of={loginForm}
      onSubmit={(output) => {
        void submitEmailAuth("signIn", output.email, output.password);
      }}
    >
      <Stack gap="sm">
        <Text c="dimmed" size="sm">
          開発・PR テスト用のメールログインです。{allowedEmailHint ?? "ALLOWED_EMAIL"}{" "}
          のみ登録できます。
        </Text>
        <Field of={loginForm} path={["email"]}>
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
          メールでログイン
        </Button>
        <Button
          disabled={isSubmitting}
          fullWidth
          loading={isSubmitting}
          onClick={() => {
            void (async () => {
              const result = await validate(loginForm);
              if (!result.success) {
                return;
              }
              const email = getInput(loginForm, { path: ["email"] });
              const password = getInput(loginForm, { path: ["password"] });
              if (typeof email !== "string" || typeof password !== "string") {
                setErrorMessage("メールアドレスとパスワードを入力してください");
                return;
              }
              await submitEmailAuth("signUp", email, password);
            })();
          }}
          type="button"
          variant="light"
        >
          初回所有者として登録
        </Button>
      </Stack>
    </Form>
  );
}
