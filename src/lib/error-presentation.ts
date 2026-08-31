import { ConvexError } from "convex/values";
import type { DomainError } from "~domain/errors";

export type ErrorRecovery = "reload" | "retry" | "signIn";

export type ErrorPresentation = {
  message: string;
  recovery: ErrorRecovery;
  title: string;
};

const DOMAIN_ERROR_PRESENTATION = {
  Conflict: { recovery: "reload", title: "ほかの操作と競合しました" },
  Forbidden: { recovery: "signIn", title: "この操作を行う権限がありません" },
  NotFound: { recovery: "retry", title: "データが見つかりませんでした" },
  Unauthenticated: { recovery: "signIn", title: "ログインが必要です" },
  ValidationFailed: { recovery: "retry", title: "入力を確認してください" },
} as const satisfies Record<DomainError["_tag"], Omit<ErrorPresentation, "message">>;

export const UNEXPECTED_ERROR_PRESENTATION = {
  message: "処理を完了できませんでした。時間をおいて、もう一度お試しください。",
  recovery: "retry",
  title: "エラーが発生しました",
} as const satisfies ErrorPresentation;

function isDomainTag(tag: string): tag is DomainError["_tag"] {
  return tag in DOMAIN_ERROR_PRESENTATION;
}

function domainErrorData(error: unknown): { message: string; tag: DomainError["_tag"] } | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }
  const data = error instanceof ConvexError ? error.data : Reflect.get(error, "data");
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const message = Reflect.get(data, "message");
  const tag = Reflect.get(data, "tag");
  if (typeof message !== "string" || typeof tag !== "string" || !isDomainTag(tag)) {
    return null;
  }
  return { message, tag };
}

export function presentError(error: unknown, fallbackMessage?: string): ErrorPresentation {
  const domain = domainErrorData(error);
  if (domain !== null) {
    return { ...DOMAIN_ERROR_PRESENTATION[domain.tag], message: domain.message };
  }
  return {
    ...UNEXPECTED_ERROR_PRESENTATION,
    message: fallbackMessage ?? UNEXPECTED_ERROR_PRESENTATION.message,
  };
}
