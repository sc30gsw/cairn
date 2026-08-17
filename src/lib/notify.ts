import { notifications } from "@mantine/notifications";

import { presentError } from "~/lib/error-presentation";

export function notifySuccess(message: string) {
  notifications.show({ color: "green", message });
}

//? 文言の決定は presentError に一本化する。ここで生の error.message を読まないことが、
//? トースト経由で内部エラーが漏れないことの保証になる
export function notifyError(error: unknown, fallbackMessage?: string) {
  const { message, title } = presentError(error, fallbackMessage);
  notifications.show({ color: "red", message, title });
}
