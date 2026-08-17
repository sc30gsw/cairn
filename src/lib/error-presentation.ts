import { ConvexError } from "convex/values";
import type { DomainError } from "~domain/errors";

export type ErrorRecovery = "reload" | "retry" | "signIn";

export type ErrorPresentation = {
  message: string;
  recovery: ErrorRecovery;
  title: string;
};

//? 見出しと復帰手段はドメインエラーのタグごとに決める。タグ集合は convex/lib/errors.ts が SSoT なので、
//? サーバ側にタグが増えたら satisfies が型エラーで知らせる
const DOMAIN_ERROR_PRESENTATION = {
  Conflict: { recovery: "reload", title: "ほかの操作と競合しました" },
  Forbidden: { recovery: "signIn", title: "権限がありません" },
  NotFound: { recovery: "retry", title: "見つかりませんでした" },
  Unauthenticated: { recovery: "signIn", title: "ログインが必要です" },
  ValidationFailed: { recovery: "retry", title: "入力を確認してください" },
} as const satisfies Record<DomainError["_tag"], Omit<ErrorPresentation, "message">>;

//* 想定外の例外向けの既定表示。生の message はスタックや Convex の内部ログを含むため利用者には出さない
export const UNEXPECTED_ERROR_PRESENTATION = {
  message: "処理を完了できませんでした。時間をおいて、もう一度お試しください。",
  recovery: "retry",
  title: "エラーが発生しました",
} as const satisfies ErrorPresentation;

function isDomainTag(tag: string): tag is DomainError["_tag"] {
  return tag in DOMAIN_ERROR_PRESENTATION;
}

//? throwDomain が積む { message, tag }。ConvexError インスタンスとして届かない経路
//? (TanStack Query のキャッシュ越しなど)もあるため、data の形で判定する
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

//* 例外を利用者向けの文言に変換する。ドメインエラーの message はサーバで用意した利用者向けの文であり、
//* それ以外は必ず既定文言に置き換える(生のエラーメッセージを画面に出さないための唯一の入口)
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
