import { notifications } from "@mantine/notifications";

import { presentError } from "~/lib/error-presentation";

export function notifySuccess(message: string) {
  notifications.show({ color: "green", message });
}

export function notifyError(error: unknown, fallbackMessage?: string) {
  const { message, title } = presentError(error, fallbackMessage);
  notifications.show({ color: "red", message, title });
}
