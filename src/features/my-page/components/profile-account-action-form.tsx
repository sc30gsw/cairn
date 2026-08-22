import { Form, type FormSchema, type FormStore } from "@formisch/react";
import { Button, Stack } from "@mantine/core";
import type { ReactNode } from "react";
import type { InferOutput } from "valibot";

import { AuthActionFeedback } from "~/features/auth/components/auth-action-feedback";
import { useAuthActionTransition } from "~/features/auth/hooks/use-auth-action-transition";
import type { AuthActionResult } from "~/lib/auth-action-result";

type ProfileAccountActionFormProps<TSchema extends FormSchema> = {
  children: ReactNode;
  form: FormStore<TSchema>;
  onSubmit: (output: InferOutput<TSchema>) => Promise<AuthActionResult>;
  onSuccess?: (result: AuthActionResult) => void;
  submitLabel: string;
  successMessage: string;
};

export function ProfileAccountActionForm<TSchema extends FormSchema>({
  children,
  form,
  onSubmit,
  onSuccess,
  submitLabel,
  successMessage,
}: ProfileAccountActionFormProps<TSchema>) {
  const { isPending, result, run } = useAuthActionTransition();

  return (
    <Form
      of={form}
      onSubmit={async (output) => {
        const next = await run(() => onSubmit(output));
        onSuccess?.(next);
      }}
    >
      <Stack gap="sm">
        {children}
        <AuthActionFeedback result={result} successMessage={successMessage} />
        <Button
          disabled={form.isSubmitting || isPending}
          loading={form.isSubmitting || isPending}
          size="xs"
          type="submit"
        >
          {submitLabel}
        </Button>
      </Stack>
    </Form>
  );
}
