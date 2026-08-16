import { notifications } from "@mantine/notifications";
import { ConvexError } from "convex/values";

const DOMAIN_ERROR_TITLES = {
  Conflict: "競合エラー",
  Forbidden: "権限エラー",
  NotFound: "見つかりません",
  Unauthenticated: "認証エラー",
  ValidationFailed: "入力エラー",
} as const satisfies Record<string, string>;

function isDomainErrorData(data: unknown): data is { message: string; tag: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string" &&
    "tag" in data &&
    typeof data.tag === "string"
  );
}

export function notifySuccess(message: string) {
  notifications.show({ color: "green", message });
}

export function notifyError(error: unknown, fallbackMessage = "操作に失敗しました") {
  if (error instanceof ConvexError && isDomainErrorData(error.data)) {
    const title =
      DOMAIN_ERROR_TITLES[error.data.tag as keyof typeof DOMAIN_ERROR_TITLES] ?? "エラー";
    notifications.show({ color: "red", message: error.data.message, title });
    return;
  }

  notifications.show({ color: "red", message: fallbackMessage, title: "エラー" });
}
